import fs from 'fs';
import path from 'path';
import { netsuiteRequest } from './rest_client/netsuiteRestClient.js';
import dotenv from 'dotenv';
dotenv.config();

const OUTPUT_DIR = './downloads';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/** List files in a folder */
async function listFiles(folderId) {
    const payload = { folderId };
    const resp = await netsuiteRequest({ method: 'POST', data: payload });
    if (resp.error) throw new Error(resp.error);
    return resp.files || [];
}

/** Download a single file */
async function downloadFile(fileInfo) {
    const { id, name, fileType, size } = fileInfo;
    const resp = await netsuiteRequest({
        method: 'GET',
        params: { fileId: id }
    });

    if (resp.error) {
        console.error(`Error ${name}: ${resp.error}`);
        return;
    }
    if (!resp.content) {
        console.error(`No content for ${name}`);
        return;
    }

    const buffer = Buffer.from(resp.content, 'base64');
    const filePath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(filePath, buffer);
    console.log(`Downloaded ${name} (${size} bytes)`);
}

/** Main */
(async () => {
    console.log(`Listing files in folder ${ROOT_FOLDER_ID}...`);
    const files = await listFiles(ROOT_FOLDER_ID);
    console.log(`Found ${files.length} file(s)`);

    for (const f of files) {
        await downloadFile(f);
    }
})();