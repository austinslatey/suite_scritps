/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/currentRecord', 'N/search', 'N/ui/dialog'], function(currentRecord, search, dialog) {

    function fieldChanged(context) {
        if (context.sublistId === 'item' && context.fieldId === 'item') {
            var rec = currentRecord.get();
            var itemId = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });

            // Run a saved search or load substitute dynamically
            var substituteData = getSubstitute(itemId);
            
            if (!substituteData) return;

            var { substituteId, substituteName, type } = substituteData;

            if (type === 'Superseded') {
                dialog.alert({
                    title: 'Item Superseded',
                    message: `The part "${substituteName}" superceeds this part and is being replaced inside the order.`
                }).then(function () {
                    replaceItem(rec, substituteId);
                });

            } else if (type === 'Replacement') {
                dialog.confirm({
                    title: 'Replace Item?',
                    message: `The part "${substituteName}" can replace this part. Would you like to replace it?`
                }).then(function (yes) {
                    if (yes) {
                        replaceItem(rec, substituteId);
                    }
                });
            }
        }
    }

    function replaceItem(rec, substituteId) {
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: substituteId });
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: '' });
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: '' });
        rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custitemcustom_mpn', value: '' });
    }

    function getSubstitute(itemId) {
        // This would likely be a saved search filtering on the "Substitute Items" sublist of the item
        var itemSearch = search.create({
            type: search.Type.ITEM,
            filters: [['internalid', 'is', itemId]],
            columns: [
                search.createColumn({ name: 'internalid' }),
                search.createColumn({ name: 'subitem', join: 'substituteItem' }),
                search.createColumn({ name: 'custrecord_sub_type', join: 'substituteItem' }),
                search.createColumn({ name: 'itemid', join: 'substituteItem' })
            ]
        });

        var results = itemSearch.run().getRange({ start: 0, end: 1 });
        if (results.length) {
            var result = results[0];
            return {
                substituteId: result.getValue({ name: 'subitem', join: 'substituteItem' }),
                substituteName: result.getText({ name: 'itemid', join: 'substituteItem' }),
                type: result.getText({ name: 'custrecord_sub_type', join: 'substituteItem' })
            };
        }

        return null;
    }

    return {
        fieldChanged: fieldChanged
    };
});

