/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doPost(context) {
        try {
            const folderId = context.folderId;
            const searchType = context.searchType || 'file';
            if (!folderId) throw new Error('folderId required');

            const results = [];

            if (searchType === 'folder') {
                // FULLY PAGINATED — WORKS WITH 10,000+ FOLDERS
                const folderSearch = search.create({
                    type: 'folder',
                    filters: [['parent', 'anyof', folderId]],
                    columns: ['name']
                });

                const paged = folderSearch.runPaged({ pageSize: 1000 });
                paged.pageRanges.forEach(pr => {
                    const page = paged.fetch({ index: pr.index });
                    page.data.forEach(r => {
                        results.push({
                            id: r.id,
                            name: r.getValue('name') || '(no name)'
                        });
                    });
                });

                return { folders: results };
            }

            // FILES — ALSO PAGINATED + URL FROM SEARCH (NO file.load!)
            const fileSearch = search.create({
                type: 'file',
                filters: [['folder', 'anyof', folderId]],
                columns: ['name', 'documentsize', 'filetype', 'url']
            });

            const paged = fileSearch.runPaged({ pageSize: 1000 });
            paged.pageRanges.forEach(pr => {
                const page = paged.fetch({ index: pr.index });
                page.data.forEach(r => {
                    results.push({
                        id: r.id,
                        name: r.getValue('name') || '(no name)',
                        size: Number(r.getValue('documentsize')) || 0,
                        fileType: r.getValue('filetype') || 'UNKNOWN',
                        url: r.getValue('url') || ''
                    });
                });
            });

            return { files: results };

        } catch (e) {
            log.error('RESTlet Error', e.message);
            return { error: e.message };
        }
    }

    return { post: doPost };
});