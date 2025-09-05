/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log'],
    function (search, record, log) {

        function execute(context) {
            try {
                var folderId = 1234; // <-- replace with your File Cabinet folder internal ID

                var fileSearch = search.create({
                    type: 'file',
                    filters: [
                        ['folder', 'anyof', folderId]
                    ],
                    columns: ['internalid', 'name']
                });

                fileSearch.run().each(function (result) {
                    var fileId = result.getValue({ name: 'internalid' });
                    var fileName = result.getValue({ name: 'name' });

                    var fileRec = record.load({
                        type: 'file',
                        id: fileId
                    });

                    fileRec.setValue({
                        fieldId: 'availablewithoutlogin',
                        value: true
                    });

                    fileRec.save();

                    log.audit('Updated File', fileName + ' (ID ' + fileId + ')');
                    return true;
                });

            } catch (e) {
                log.error('Error in Scheduled Script', e);
            }
        }

        return {
            execute: execute
        };
    });
