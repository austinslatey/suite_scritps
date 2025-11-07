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

// ---------------------------------------------------------------------
// 1. List files + get full public URL from RESTlet
// ---------------------------------------------------------------------
const listFiles = async (folderId) => {
    const resp = await withRetry(() => netsuiteRequest({
        method: 'POST',
        data: { folderId }
    }));
    if (resp.error) throw new Error(resp.error);

    const files = resp.files || [];

    // Serialize GETs: Process one file at a time
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        console.log(`Fetching URL for ${f.name} (${i + 1}/${files.length})...`);

        try {
            const getResp = await netsuiteRequest({
                method: 'GET',
                params: { fileId: f.id, skipContent: 'true' }
            });
            if (getResp.error || !getResp.url) {
                f.publicUrl = 'ERROR: No URL';
                f.content = null;
            } else {
                f.publicUrl = getResp.url;
                f.content = getResp.content;
            }
        } catch (err) {
            console.error(`Failed to fetch ${f.name}:`, err.message);
            f.publicUrl = 'ERROR: Fetch failed';
            f.content = null;
        }

        // Delay 1-2s between requests to respect concurrency
        if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    return files;
};

// ---------------------------------------------------------------------
// 2. Download
// ---------------------------------------------------------------------
const downloadFile = async (fileInfo) => {
    const { name, content } = fileInfo;
    if (!content) {
        console.error(`No content for ${name}`);
        return;
    }
    const buffer = Buffer.from(content, 'base64');
    const filePath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded ${name}`);
};

// ---------------------------------------------------------------------
// 3. Write CSV (one file, exact headers)
// ---------------------------------------------------------------------
const writeCsv = async (files) => {
    const records = files.map(f => ({
        name: f.name,
        url: f.publicUrl,
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
    console.log(`CSV generated: ${CSV_FILE} (${records.length} rows)`);
};

// ---------------------------------------------------------------------
// 4. Inquirer Menu
// ---------------------------------------------------------------------
const askMode = async () => {
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?',
            choices: [
                { name: 'Download files only', value: 'download' },
                { name: 'Generate CSV with URLs only', value: 'csv' },
                { name: 'Do both (download + CSV)', value: 'both' }
            ]
        }
    ]);
    return mode;
};

// ---------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------
(async () => {
    try {
        console.log(`Listing files in folder ${ROOT_FOLDER_ID}...`);
        const files = await listFiles(ROOT_FOLDER_ID);
        console.log(`Found ${files.length} file(s)`);
        if (!files.length) return;

        const mode = await askMode();

        if (mode === 'download' || mode === 'both') {
            console.log(`Downloading ${files.length} file(s)...`);
            for (const f of files) await downloadFile(f);
        }
        if (mode === 'csv' || mode === 'both') {
            await writeCsv(files);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
})();