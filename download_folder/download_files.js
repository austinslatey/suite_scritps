import fs from 'fs';
import path from 'path';
import { netsuiteRequest } from './rest_client/netsuiteRestClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OUTPUT_DIR = './downloads';
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function listFiles(folderId) {
    const response = await netsuiteRequest({
        path: `/record/v1/file`,
        params: { folder: folderId, limit: 1000 },
    });
    return response.items || [];
}

async function downloadFile(fileId, fileName) {
    const fileData = await netsuiteRequest({
        path: `/record/v1/file/${fileId}/media`,
        responseType: 'arraybuffer',
    });

    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, fileData);
    console.log(`Downloaded ${fileName}`);
}

(async () => {
    console.log(`Getting files from folder ${ROOT_FOLDER_ID}...`);
    const files = await listFiles(ROOT_FOLDER_ID);
    console.log(`Found ${files.length} file(s)`);

    for (const f of files) {
        await downloadFile(f.id, f.name);
    }
})();
