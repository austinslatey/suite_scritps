#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { netsuiteRequest } from './rest_client/netsuiteRestClient.js';
import dotenv from 'dotenv';
import { createObjectCsvWriter } from 'csv-writer';
import inquirer from 'inquirer';

dotenv.config();

const OUTPUT_DIR = './downloads';
const CSV_FILE = process.env.CSV_OUTPUT || 'files.csv';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;
const ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID;
const RESTLET_BASE = process.env.NETSUITE_DOWNLOAD_RESTLET_URL;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------
// 1. Build the *real* NetSuite file-cabinet URL (public / internal)
// ---------------------------------------------------------------------
const buildPublicFileUrl = (fileId) => {
    // NetSuite file-cabinet URL pattern:
    // https://{account}.app.netsuite.com/core/media/media.nl?id={fileId}&c={account}&h={hash}
    // The hash is **not** needed for internal users – we can omit it.
    const base = `https://${ACCOUNT_ID}.app.netsuite.com/core/media/media.nl`;
    const params = new URLSearchParams({ id: fileId, c: ACCOUNT_ID });
    return `${base}?${params.toString()}`;
};

// ---------------------------------------------------------------------
// 2. RESTlet helpers
// ---------------------------------------------------------------------
const listFiles = async (folderId) => {
    const resp = await netsuiteRequest({
        method: 'POST',
        data: { folderId }
    });
    if (resp.error) throw new Error(resp.error);
    return resp.files || [];
};

const downloadFile = async (fileInfo) => {
    const { id, name } = fileInfo;
    const resp = await netsuiteRequest({
        method: 'GET',
        params: { fileId: id }
    });

    if (resp.error || !resp.content) {
        console.error(`Failed ${name}: ${resp.error || 'no content'}`);
        return;
    }

    const buffer = Buffer.from(resp.content, 'base64');
    const filePath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded ${name}`);
};

// ---------------------------------------------------------------------
// 3. CSV writer
// ---------------------------------------------------------------------
const writeCsv = async (files) => {
    const records = files.map(f => ({
        name: f.name,
        internalUrl: buildPublicFileUrl(f.id),   // <-- REAL NetSuite URL
        size: f.size,
        type: f.fileType
    }));

    const csvWriter = createObjectCsvWriter({
        path: CSV_FILE,
        header: [
            { id: 'name', title: 'File Name' },
            { id: 'internalUrl', title: 'NetSuite URL' },
            { id: 'size', title: 'Size (bytes)' },
            { id: 'type', title: 'File Type' }
        ]
    });

    await csvWriter.writeRecords(records);
    console.log(`CSV saved: ${CSV_FILE} (${records.length} rows)`);
};

// ---------------------------------------------------------------------
// 4. Inquirer menu
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