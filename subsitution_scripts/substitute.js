/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/search'], function (record, dialog, search) {
    function validateLine(context) {
        var salesOrder = context.currentRecord;
        var sublistId = context.sublistId;

        if (sublistId === 'item') {
            var itemId = salesOrder.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });

            // Search for substitute items
            var substituteSearch = search.create({
                type: 'itemsubstitute',
                filters: [
                    ['item', 'is', itemId],
                    'AND',
                    ['isinactive', 'is', false]
                ],
                columns: [
                    'substituteitem',
                    'custrecord_substitute_type'
                ]
            });

            var searchResult = substituteSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                var substituteItemId = searchResult[0].getValue('substituteitem');
                var substituteType = searchResult[0].getValue('custrecord_substitute_type');
                var substituteItemName = searchResult[0].getText('substituteitem');

                if (substituteType === 'SUPERSEDED') {
                    dialog.alert({
                        title: 'Superseded Item',
                        message: 'The part "' + substituteItemName + '" supersedes this part and is being replaced inside the sales order.'
                    }).then(function () {
                        // Automatically replace with superseded item
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: substituteItemId
                        });
                    });
                } else if (substituteType === 'REPLACEMENT') {
                    dialog.confirm({
                        title: 'Replacement Item Available',
                        message: 'The part "' + substituteItemName + '" can replace this part. Would you like to replace it?'
                    }).then(function (confirmed) {
                        if (confirmed) {
                            salesOrder.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: substituteItemId
                            });
                        }
                    });
                }
            }
        }
        return true;
    }

    return {
        validateLine: validateLine
    };
});