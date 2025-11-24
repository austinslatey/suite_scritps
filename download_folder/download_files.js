#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { netsuiteRequest } from './rest_client/netsuiteRestClient.js';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';
import inquirer from 'inquirer';

dotenv.config();

const OUTPUT_DIR = './downloads';
const CSV_FILE = process.env.CSV_OUTPUT || 'shopify_part_images.csv';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;
const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;

if (!ROOT_FOLDER_ID || !ACCOUNT_ID) {
    console.error('Missing ROOT_FOLDER_ID or NETSUITE_ACCOUNT_ID in .env');
    process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const filesByFolder = new Map();
const processedFileIds = new Set();
let failedFolders = 0;

// ULTRA-DEFENSIVE request wrapper — never returns undefined
const safeRequest = async (payload) => {
    for (let i = 0; i < 8; i++) {
        try {
            const resp = await netsuiteRequest(payload);
            // Force object return even if client is broken
            if (!resp || typeof resp !== 'object') return { error: 'Invalid response' };
            return resp;
        } catch (e) {
            if (i === 7) return { error: e.message || 'Network error' };
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
        }
    }
};

const listSubfolders = async (folderId) => {
    const resp = await safeRequest({
        method: 'POST',
        data: { folderId, searchType: 'folder' }
    });
    if (resp.error) {
        console.error(`Subfolder fail ${folderId}:`, resp.error);
        failedFolders++;
        return [];
    }
    return resp.folders || [];
};

const listFilesInFolder = async (folderId) => {
    const resp = await safeRequest({
        method: 'POST',
        data: { folderId, searchType: 'file' }
    });
    if (resp.error) {
        console.error(`File list fail ${folderId}:`, resp.error);
        failedFolders++;
        return [];
    }
    return resp.files || [];
};

const processFileWithUrl = (file) => {
    file.publicUrl = (file.url && file.url.startsWith('/core')) ? file.url : '';
};

const traverseFolder = async (folderId, folderName = null, depth = 0) => {
    const indent = '  '.repeat(depth);
    const name = folderName ? `"${folderName}"` : `Root (${folderId})`;
    console.log(`${indent}Scanning: ${name}`);

    const subfolders = await listSubfolders(folderId);

    if (depth > 0 && folderName) {
        const files = await listFilesInFolder(folderId);
        if (files.length) {
            if (!filesByFolder.has(folderName)) filesByFolder.set(folderName, []);
            const newFiles = files.filter(f => !processedFileIds.has(f.id));
            if (newFiles.length) {
                console.log(`${indent}  → ${newFiles.length} image(s)`);
                newFiles.forEach(f => {
                    processFileWithUrl(f);
                    processedFileIds.add(f.id);
                    filesByFolder.get(folderName).push(f);
                });
            }
        }
    } else if (depth === 0) {
        console.log(`${indent}Skipping root files`);
    }

    const BATCH = 10;
    for (let i = 0; i < subfolders.length; i += BATCH) {
        await Promise.all(
            subfolders.slice(i, i + BATCH).map(s => traverseFolder(s.id, s.name, depth + 1))
        );
        if (i + BATCH < subfolders.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
};

const writeCsv = async () => {
    const BASE = `https://${ACCOUNT_ID}.app.netsuite.com`;
    const headers = [{ id: 'Part Number', title: 'Part Number' }];
    for (let i = 1; i <= 10; i++) {
        headers.push({ id: `Image Name ${i}`, title: `Image Name ${i}` });
        headers.push({ id: `Image URL ${i}`, title: `Image URL ${i}` });
    }

    const records = [];
    for (const part of [...filesByFolder.keys()].sort()) {
        let files = [...filesByFolder.get(part)];
        const main = files.find(f => {
            const b = f.name.replace(/\.[^.]+$/, '');
            return b === part || !/[_-]\d+$/.test(b.slice(part.length));
        });
        if (main) files = files.filter(f => f.id !== main.id);
        files.sort((a, b) => {
            const na = a.name.match(/[_-](\d+)/)?.[1] ?? Infinity;
            const nb = b.name.match(/[_-](\d+)/)?.[1] ?? Infinity;
            return na - nb || a.name.localeCompare(b.name);
        });
        const ordered = main ? [main, ...files] : files;
        const row = { 'Part Number': part };
        for (let i = 0; i < 10; i++) {
            const f = ordered[i];
            row[`Image Name ${i + 1}`] = f?.name || '';
            row[`Image URL ${i + 1}`] = f?.publicUrl ? `${BASE}${f.publicUrl}` : '';
        }
        records.push(row);
    }

    await createObjectCsvWriter({ path: CSV_FILE, header: headers }).writeRecords(records);
    console.log(`\nCSV READY: ${CSV_FILE} (${records.length} products)`);
};

(async () => {
    console.log(`Starting scan of ${ROOT_FOLDER_ID}\n`);
    const start = Date.now();

    await traverseFolder(ROOT_FOLDER_ID);

    const total = [...filesByFolder.values()].flat().length;
    const mins = ((Date.now() - start) / 60000).toFixed(1);

    console.log(`\nDONE in ${mins} min | ${total.toLocaleString()} images | ${filesByFolder.size.toLocaleString()} folders`);
    if (failedFolders) console.log(`${failedFolders} folders failed (expected)`);

    if (!total) return console.log('No images found');

    const { mode } = await inquirer.prompt([{
        type: 'list', name: 'mode', message: 'Next?',
        choices: ['CSV only', 'Download images', 'Both']
    }]);

    if (mode.includes('Download')) {
        console.log(`\nDownloading ${total} images...`);
        let ok = 0;
        for (const f of [...filesByFolder.values()].flat()) {
            if (f.publicUrl) {
                try {
                    const r = await fetch(`https://${ACCOUNT_ID}.app.netsuite.com${f.publicUrl}`);
                    if (r.ok) {
                        fs.writeFileSync(path.join(OUTPUT_DIR, f.name), Buffer.from(await r.arrayBuffer()));
                        if (++ok % 100 === 0) console.log(`   ${ok} downloaded`);
                    }
                } catch { }
                await new Promise(r => setTimeout(r, 70));
            }
        }
    }

    if (mode.includes('CSV')) await writeCsv();

    console.log('\nVICTORY IS YOURS.');
    console.log(`CSV → ${CSV_FILE}`);
    if (mode.includes('Download')) console.log(`Images → ${OUTPUT_DIR}/`);
})();