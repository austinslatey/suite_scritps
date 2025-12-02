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

const filesByFolder = new Map();   // folderName → array of files (for subfolders)
const rootFiles = [];              // ← NEW: flat list for root-only files
const processedFileIds = new Set();
let failedFolders = 0;
let scanMode = 'nonroot';

// ─────────────────────────────────────────────────────────────────────────────
// Safe request & helpers
// ─────────────────────────────────────────────────────────────────────────────
const safeRequest = async (payload) => {
    for (let i = 0; i < 8; i++) {
        try {
            const resp = await netsuiteRequest(payload);
            if (!resp || typeof resp !== 'object') return { error: 'Invalid response' };
            return resp;
        } catch (e) {
            if (i === 7) return { error: e.message || 'Network error' };
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
        }
    }
};

const listSubfolders = async (folderId) => {
    const resp = await safeRequest({ method: 'POST', data: { folderId, searchType: 'folder' } });
    if (resp.error) { console.error(`Subfolder fail ${folderId}:`, resp.error); failedFolders++; return []; }
    return Array.isArray(resp.folders) ? resp.folders : [];
};

const listFilesInFolder = async (folderId) => {
    const resp = await safeRequest({ method: 'POST', data: { folderId, searchType: 'file' } });
    if (resp.error) { console.error(`File list fail ${folderId}:`, resp.error); failedFolders++; return []; }
    return Array.isArray(resp.files) ? resp.files : [];
};

const processFileWithUrl = (file) => {
    file.publicUrl = (file.url && file.url.startsWith('/core')) ? file.url : '';
};

// ─────────────────────────────────────────────────────────────────────────────
// Traversal
// ─────────────────────────────────────────────────────────────────────────────
const traverseFolder = async (folderId, folderName = null, depth = 0) => {
    const indent = '  '.repeat(depth);
    const name = folderName ? `"${folderName}"` : `Root (${folderId})`;
    console.log(`${indent}Scanning: ${name}`);

    const subfolders = await listSubfolders(folderId);

    // ROOT LEVEL
    if (depth === 0) {
        if (scanMode !== 'nonroot') {
            const files = await listFilesInFolder(folderId);
            if (files.length > 0) {
                const newFiles = files.filter(f => !processedFileIds.has(f.id));
                if (newFiles.length) {
                    console.log(`${indent}  → ${newFiles.length} image(s) in root`);
                    newFiles.forEach(f => {
                        processFileWithUrl(f);
                        processedFileIds.add(f.id);
                        rootFiles.push(f);           // ← store separately
                    });
                }
            }
        } else {
            console.log(`${indent}Skipping root files (sub-folders only mode)`);
        }
    }

    // SUBFOLDERS
    if (depth > 0 && scanMode !== 'rootonly') {
        const files = await listFilesInFolder(folderId);
        if (files.length > 0) {
            filesByFolder.set(folderName, filesByFolder.get(folderName) || []);
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
    }

    // RECURSE
    if (scanMode !== 'rootonly' && subfolders.length > 0) {
        const BATCH = 10;
        for (let i = 0; i < subfolders.length; i += BATCH) {
            await Promise.all(
                subfolders.slice(i, i + BATCH).map(s => traverseFolder(s.id, s.name, depth + 1))
            );
            if (i + BATCH < subfolders.length) await new Promise(r => setTimeout(r, 1000));
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV WRITER – different logic for root vs subfolders
// ─────────────────────────────────────────────────────────────────────────────
const writeCsv = async () => {
    const BASE = `https://${ACCOUNT_ID}.app.netsuite.com`;

    const headers = [
        { id: 'Part Number', title: 'Part Number' },
        { id: 'Image Name', title: 'Image Name' },
        { id: 'Image URL', title: 'Image URL' }
    ];

    const records = [];

    // 1. ROOT FILES – one row per image (flat list)
    if (rootFiles.length > 0) {
        rootFiles.forEach(f => {
            records.push({
                'Part Number': 'ROOT_FILE',           // or f.name, or leave blank – you choose
                'Image Name': f.name,
                'Image URL': f.publicUrl ? `${BASE}${f.publicUrl}` : ''
            });
        });
    }

    // 2. SUBFOLDER FILES – your original grouped logic (up to 10 images per part)
    const subfolderKeys = [...filesByFolder.keys()].sort((a, b) => a.localeCompare(b));
    for (const part of subfolderKeys) {
        let files = [...filesByFolder.get(part)];

        const main = files.find(f => {
            const base = f.name.replace(/\.[^.]+$/, '');
            return base === part || !/[_-]\d+$/.test(base.slice(part.length));
        });
        if (main) files = files.filter(f => f.id !== main.id);

        files.sort((a, b) => {
            const na = a.name.match(/[_-](\d+)/)?.[1] ?? Infinity;
            const nb = b.name.match(/[_-](\d+)/)?.[1] ?? Infinity;
            return na - nb || a.name.localeCompare(b.name);
        });

        const ordered = main ? [main, ...files] : files;

        const row = { 'Part Number': part, 'Image Name': '', 'Image URL': '' };
        for (let i = 0; i < 10; i++) {
            const f = ordered[i];
            if (f) {
                row['Part Number'] = i === 0 ? part : '';  // only show part number on first row
                row['Image Name'] = f.name;
                row['Image URL'] = f.publicUrl ? `${BASE}${f.publicUrl}` : '';
                records.push({ ...row });
            }
        }
        if (ordered.length === 0) {
            records.push({ 'Part Number': part, 'Image Name': '', 'Image URL': '' });
        }
    }

    await createObjectCsvWriter({ path: CSV_FILE, header: headers }).writeRecords(records);
    console.log(`\nCSV READY: ${CSV_FILE} (${records.length} rows)`);
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
    console.log(`Starting scan of folder ${ROOT_FOLDER_ID}\n`);

    const { chosenMode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'chosenMode',
            message: 'Which files do you want to collect?',
            choices: [
                { name: 'Only files in sub-folders (skip root folder files)', value: 'nonroot' },
                { name: 'Only files that live directly in the root folder', value: 'rootonly' },
                { name: 'Files from root folder AND all sub-folders (both)', value: 'both' },
            ],
            default: 'nonroot'
        }
    ]);

    scanMode = chosenMode;
    console.log(`\nMode selected: ${scanMode
        .replace('nonroot', 'sub-folders only')
        .replace('rootonly', 'root only')
        .replace('both', 'root + sub-folders')}\n`);

    const start = Date.now();
    await traverseFolder(ROOT_FOLDER_ID);

    const total = rootFiles.length + [...filesByFolder.values()].flat().length;
    const mins = ((Date.now() - start) / 60000).toFixed(1);

    console.log(`\nDONE in ${mins} min | ${total.toLocaleString()} images | ${filesByFolder.size} subfolders (+ ${rootFiles.length} root files)`);
    if (failedFolders) console.log(`${failedFolders} folders failed`);

    if (total === 0) {
        console.log('No images found');
        process.exit(0);
    }

    const { mode } = await inquirer.prompt([
        { type: 'list', name: 'mode', message: 'Next?', choices: ['CSV only', 'Download images', 'Both'] }
    ]);

    if (mode.includes('Download')) {
        console.log(`\nDownloading ${total} images...`);
        let ok = 0;
        for (const f of [...rootFiles, ...[...filesByFolder.values()].flat()]) {
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
        console.log(`\nDownloaded ${ok} images`);
    }

    if (mode.includes('CSV')) await writeCsv();

    console.log('\nVICTORY IS YOURS.');
    console.log(`CSV → ${CSV_FILE}`);
    if (mode.includes('Download')) console.log(`Images → ${OUTPUT_DIR}/`);
})();