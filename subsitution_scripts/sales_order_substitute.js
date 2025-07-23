/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/message', 'N/search', 'N/log'], function (record, message, search, log) {
    function beforeSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var salesOrder = context.newRecord;
            var lineCount = salesOrder.getLineCount({ sublistId: 'item' });

            log.debug({
                title: 'Sales Order Before Submit',
                details: 'Processing Sales Order, ID: ' + (salesOrder.id || 'New') + ', Lines: ' + lineCount
            });

            for (var i = 0; i < lineCount; i++) {
                var itemId = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });

                try {
                    log.debug({
                        title: 'Checking Item Substitute',
                        details: 'Searching for substitutes for item ID: ' + itemId
                    });

                    // Search Inventory Item for substitutes
                    var itemSearch = search.create({
                        type: 'inventoryitem',
                        filters: [
                            ['internalid', 'is', itemId],
                            'AND',
                            ['itemsubstitution.substitute', 'isnotempty', '']
                        ],
                        columns: [
                            search.createColumn({
                                name: 'substitute',
                                join: 'itemsubstitution'
                            }),
                            search.createColumn({
                                name: 'custitem_substitute_type',
                                join: 'itemsubstitution'
                            })
                        ]
                    });

                    var searchResult = itemSearch.run().getRange({ start: 0, end: 1 });

                    if (searchResult.length > 0) {
                        var substituteItemId = searchResult[0].getValue({
                            name: 'substitute',
                            join: 'itemsubstitution'
                        });
                        var substituteType = searchResult[0].getValue({
                            name: 'custitem_substitute_type',
                            join: 'itemsubstitution'
                        });
                        var substituteItemName = searchResult[0].getText({
                            name: 'substitute',
                            join: 'itemsubstitution'
                        });

                        log.debug({
                            title: 'Found Substitute',
                            details: 'Item ID: ' + itemId + ', Substitute Type: ' + substituteType + ', Substitute Item: ' + substituteItemName
                        });

                        if (substituteType === 'SUPERSEDED') {
                            salesOrder.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i,
                                value: substituteItemId
                            });
                            context.form.addPageInitMessage({
                                type: message.Type.INFORMATION,
                                message: 'The part "' + substituteItemName + '" supersedes item on line ' + (i + 1) + ' and has been replaced in the sales order.',
                                duration: 5000
                            });
                        } else if (substituteType === 'REPLACEMENT') {
                            salesOrder.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_replacement_info',
                                line: i,
                                value: JSON.stringify({
                                    substituteType: substituteType,
                                    substituteItemId: substituteItemId,
                                    substituteItemName: substituteItemName
                                })
                            });
                            context.form.addPageInitMessage({
                                type: message.Type.WARNING,
                                message: 'The part "' + substituteItemName + '" can replace item on line ' + (i + 1) + '. A prompt will appear to confirm replacement.',
                                duration: 5000
                            });
                        }
                    }
                } catch (e) {
                    log.error({
                        title: 'Error in Item Substitute Search',
                        details: 'Error searching inventoryitem for item ID ' + itemId + ': ' + e.message
                    });
                    context.form.addPageInitMessage({
                        type: message.Type.ERROR,
                        message: 'An error occurred while checking for substitute items on line ' + (i + 1) + ': ' + e.message,
                        duration: 10000
                    });
                }
            }
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});