/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/file', 'N/search'], function (file, search) {

    // GET  → download one file
    function get(context) {
        try {
            const fileId = context.fileId;
            const skipContent = context.skipContent === 'true';  // Flag from client
            if (!fileId) throw new Error('fileId is required');

            const fileObj = file.load({ id: fileId });

            return {
                id: fileObj.id,
                name: fileObj.name,
                fileType: fileObj.fileType,
                size: fileObj.size,
                url: fileObj.url,  // Public URL with hash
                content: skipContent ? null : fileObj.getContents()  // Skip for CSV-only
            };
        } catch (e) {
            return { error: e.message };
        }
    }

    // POST → list files in a folder
    function post(context) {
        try {
            const folderId = context.folderId;
            if (!folderId) throw new Error('folderId is required');

            const results = [];
            search.create({
                type: 'file',
                filters: [
                    ['folder', 'anyof', folderId]
                ],
                columns: [
                    'name',
                    'documentsize',  // ← Correct column for file size in bytes
                    'filetype'
                ]
            }).run().each(function (r) {
                results.push({
                    id: r.id,
                    name: r.getValue('name'),
                    size: Number(r.getValue('documentsize')) || 0,
                    fileType: r.getValue('filetype')
                });
                return true;
            });

            return { files: results };
        } catch (e) {
            return { error: e.message };
        }
    }

    return { get, post };
});