/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/log'], function (record, dialog, log) {
    function pageInit(context) {
        var salesOrder = context.currentRecord;
        var lineCount = salesOrder.getLineCount({ sublistId: 'item' });

        log.debug({
            title: 'Sales Order Page Init',
            details: 'Processing Sales Order, Lines: ' + lineCount
        });

        for (var i = 0; i < lineCount; i++) {
            var replacementInfo = salesOrder.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_replacement_info',
                line: i
            });

            if (replacementInfo) {
                try {
                    var info = JSON.parse(replacementInfo);
                    log.debug({
                        title: 'Processing Replacement Info',
                        details: 'Line ' + (i + 1) + ': ' + JSON.stringify(info)
                    });
                    if (info.substituteType === 'REPLACEMENT') {
                        dialog.confirm({
                            title: 'Replacement Item Available',
                            message: 'The part "' + info.substituteItemName + '" can replace item on line ' + (i + 1) + '. Would you like to replace it?'
                        }).then(function (confirmed) {
                            if (confirmed) {
                                salesOrder.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });
                                salesOrder.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: info.substituteItemId
                                });
                                salesOrder.commitLine({ sublistId: 'item' });
                                log.debug({
                                    title: 'Replacement Confirmed',
                                    details: 'Replaced item on line ' + (i + 1) + ' with ' + info.substituteItemName
                                });
                            }
                        });
                    }
                } catch (e) {
                    log.error({
                        title: 'Error Processing Replacement Info',
                        details: 'Error on line ' + (i + 1) + ': ' + e.message
                    });
                }
            }
        }
    }

    return {
        pageInit: pageInit
    };
});