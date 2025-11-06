/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/file', 'N/search'], function (file, search) {

    // GET  → download one file
    function get(context) {
        try {
            const fileId = context.fileId;
            if (!fileId) throw new Error('fileId is required');

            const fileObj = file.load({ id: fileId });

            return {
                id: fileObj.id,
                name: fileObj.name,
                fileType: fileObj.fileType,
                size: fileObj.size,
                content: fileObj.getContents()          // base64 string
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
                    ['folder', 'anyof', folderId],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    'name',
                    'filetype'
                ]
            }).run().each(function (r) {
                const fileObj = file.load({ id: r.id });
                results.push({
                    id: r.id,
                    name: r.getValue('name'),
                    size: fileObj.size,
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