/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/file'], function (file) {

    function get(context) {
        try {
            const fileId = context.fileId;

            if (!fileId) {
                return {
                    error: 'fileId parameter is required'
                };
            }

            // Load the file
            const fileObj = file.load({
                id: fileId
            });

            // Return file as base64
            return {
                id: fileObj.id,
                name: fileObj.name,
                fileType: fileObj.fileType,
                size: fileObj.size,
                content: fileObj.getContents()
            };

        } catch (e) {
            return {
                error: e.message
            };
        }
    }

    function post(context) {
        try {
            const folderId = context.folderId;

            if (!folderId) {
                return {
                    error: 'folderId parameter is required'
                };
            }

            // Search for files in folder
            const fileSearch = file.load({
                id: folderId
            });

            // Return list of files
            return {
                files: [] // Implement folder listing if needed
            };

        } catch (e) {
            return {
                error: e.message
            };
        }
    }

    return {
        get: get,
        post: post
    };
});