#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { netsuiteRequest, withRetry } from './rest_client/netsuiteRestClient.js';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';
import inquirer from 'inquirer';

dotenv.config();

const OUTPUT_DIR = './downloads';
const CSV_FILE = process.env.CSV_OUTPUT || 'shopify_files.csv';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Global array to collect all files
const allFiles = [];

// ---------------------------------------------------------------------
// 1. List files in a folder (direct children only)
// ---------------------------------------------------------------------
const listFilesInFolder = async (folderId) => {
    const resp = await withRetry(() => netsuiteRequest({
        method: 'POST',
        data: { folderId, searchType: 'file' }
    }));
    if (resp.error) throw new Error(resp.error);
    return resp.files || [];
};

// ---------------------------------------------------------------------
// 2. List subfolders in a folder
// ---------------------------------------------------------------------
const listSubfolders = async (folderId) => {
    const resp = await withRetry(() => netsuiteRequest({
        method: 'POST',
        data: { folderId, searchType: 'folder' }
    }));
    if (resp.error) throw new Error(resp.error);
    return resp.folders || [];
};

// ---------------------------------------------------------------------
// 3. Fetch public URL (and optional content) for a single file
// ---------------------------------------------------------------------
const fetchFileDetails = async (file, skipContent = true) => {
    try {
        const getResp = await netsuiteRequest({
            method: 'GET',
            params: { fileId: file.id, skipContent: skipContent ? 'true' : 'false' }
        });

        if (getResp.error || !getResp.url) {
            file.publicUrl = 'ERROR: No URL';
            file.content = null;
        } else {
            file.publicUrl = getResp.url;
            file.content = skipContent ? null : getResp.content;
        }
    } catch (err) {
        console.error(`Failed to fetch ${file.name}:`, err.message);
        file.publicUrl = 'ERROR: Fetch failed';
        file.content = null;
    }
};

// ---------------------------------------------------------------------
// 4. Recursive traversal
// ---------------------------------------------------------------------
const traverseFolder = async (folderId, depth = 0) => {
    const indent = '  '.repeat(depth);
    console.log(`${indent}Scanning folder ID: ${folderId}`);

    // --- Get files ---
    const files = await listFilesInFolder(folderId);
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        console.log(`${indent}  [${i + 1}/${files.length}] ${f.name}`);

        // Always get URL; skip content unless downloading
        await fetchFileDetails(f, true);
        allFiles.push(f);

        // Rate limit
        if (i < files.length - 1) {
            await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        }
    }

    // --- Get subfolders and recurse ---
    const subfolders = await listSubfolders(folderId);
    for (const sub of subfolders) {
        await traverseFolder(sub.id, depth + 1);
    }
};

// ---------------------------------------------------------------------
// 5. Download file content (if not already fetched)
// ---------------------------------------------------------------------
const downloadFile = async (fileInfo) => {
    const { name, content, publicUrl } = fileInfo;

    if (content) {
        const buffer = Buffer.from(content, 'base64');
        const filePath = path.join(OUTPUT_DIR, name);
        fs.writeFileSync(filePath, buffer);
        console.log(`Downloaded: ${name}`);
        return;
    }

    if (!publicUrl || publicUrl.includes('ERROR')) {
        console.error(`Skipping ${name}: no valid URL or content`);
        return;
    }

    // Fetch full content
    console.log(`Fetching full content for ${name}...`);
    await fetchFileDetails(fileInfo, false);

    if (fileInfo.content) {
        const buffer = Buffer.from(fileInfo.content, 'base64');
        const filePath = path.join(OUTPUT_DIR, name);
        fs.writeFileSync(filePath, buffer);
        console.log(`Downloaded: ${name}`);
    } else {
        console.error(`Failed to download content for ${name}`);
    }
};

// ---------------------------------------------------------------------
// 6. Write CSV
// ---------------------------------------------------------------------
const writeCsv = async () => {
    const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
    const BASE_URL = `https://${ACCOUNT_ID}.app.netsuite.com`;

    const records = allFiles.map(f => ({
        name: f.name,
        url: f.publicUrl && !f.publicUrl.includes('ERROR') ? `${BASE_URL}${f.publicUrl}` : '',
        size: f.size,
        type: f.fileType
    }));

    const csvWriter = createObjectCsvWriter({
        path: CSV_FILE,
        header: [
            { id: 'name', title: 'File Name' },
            { id: 'url', title: 'NetSuite URL' },
            { id: 'size', title: 'Size (bytes)' },
            { id: 'type', title: 'File Type' }
        ]
    });

    await csvWriter.writeRecords(records);
    console.log(`\nCSV generated: ${CSV_FILE} (${records.length} files)`);
};

// ---------------------------------------------------------------------
// 7. Inquirer Menu
// ---------------------------------------------------------------------
const askMode = async () => {
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?',
            choices: [
                { name: 'Generate CSV with URLs only', value: 'csv' },
                { name: 'Download files only', value: 'download' },
                { name: 'Do both (download + CSV)', value: 'both' }
            ]
        }
    ]);
    return mode;
};

// ---------------------------------------------------------------------
// 8. Main
// ---------------------------------------------------------------------
(async () => {
    try {
        if (!ROOT_FOLDER_ID) {
            throw new Error('ROOT_FOLDER_ID is required in .env');
        }

        console.log(`Starting recursive scan from folder ID: ${ROOT_FOLDER_ID}\n`);
        await traverseFolder(ROOT_FOLDER_ID);

        console.log(`\nFound ${allFiles.length} file(s) across all folders.\n`);

        if (allFiles.length === 0) return;

        const mode = await askMode();

        if (mode === 'download' || mode === 'both') {
            console.log(`Downloading ${allFiles.length} file(s)...`);
            for (const f of allFiles) {
                await downloadFile(f);
                await new Promise(r => setTimeout(r, 500)); // Be gentle
            }
        }

        if (mode === 'csv' || mode === 'both') {
            await writeCsv();
        }

        console.log('\nDone!');
    } catch (err) {
        console.error('Error:', err.message);
    }
})();