/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/file', 'N/search'], function (file, search) {

    // GET → download one file
    function doGet(context) {
        try {
            const fileId = context.fileId;
            const skipContent = context.skipContent === 'true';
            if (!fileId) throw new Error('fileId is required');

            const fileObj = file.load({ id: fileId });

            return {
                id: fileObj.id,
                name: fileObj.name,
                fileType: fileObj.fileType,
                size: fileObj.size,
                url: fileObj.url,
                content: skipContent ? null : fileObj.getContents()
            };
        } catch (e) {
            return { error: e.message };
        }
    }

    // POST → list files OR folders
    function doPost(context) {
        try {
            const folderId = context.folderId;
            const searchType = context.searchType || 'file'; // 'file' or 'folder'
            if (!folderId) throw new Error('folderId is required');

            const results = [];

            if (searchType === 'folder') {
                // List subfolders
                search.create({
                    type: 'folder',
                    filters: [['parent', 'anyof', folderId]],
                    columns: ['name']
                }).run().each(function (r) {
                    results.push({
                        id: r.id,
                        name: r.getValue('name')
                    });
                    return true;
                });
                return { folders: results };
            } else {
                // List files
                search.create({
                    type: 'file',
                    filters: [['folder', 'anyof', folderId]],
                    columns: ['name', 'documentsize', 'filetype']
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
            }
        } catch (e) {
            return { error: e.message };
        }
    }

    return {
        get: doGet,
        post: doPost
    };
});