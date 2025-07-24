/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/search'], function (record, dialog, search) {
    function validateLine(context) {
        console.log('Entering validateLine function');
        
        var salesOrder = context.currentRecord;
        var sublistId = context.sublistId;

        if (sublistId === 'item') {
            var itemId = salesOrder.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            console.log('Current itemId:', itemId);

            // Search for substitute items
            console.log('Creating substitute search');
            var substituteSearch = search.create({
                type: 'customrecord_item_substitution', // Updated to include underscore; confirm this matches your custom record's Script ID
                filters: [
                    ['custrecord_item', 'is', itemId], // Parent item field; adjust ID if different
                    'AND',
                    ['isinactive', 'is', false]
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_substituteitem' }), // Substitute item field
                    search.createColumn({ name: 'custrecord_substitute_type1' }), // Substitute type field
                    search.createColumn({ 
                        name: 'formulatext', 
                        formula: '{custrecord_substituteitem.itemid}', // Formula to get substitute item's number (e.g., "30804")
                        label: 'Substitute Item Number' 
                    })
                ]
            });

            console.log('Running search');
            var searchResult = substituteSearch.run().getRange({ start: 0, end: 1 });
            console.log('Search results:', searchResult);

            if (searchResult.length > 0) {
                var substituteItemId = searchResult[0].getValue('custrecord_substituteitem');
                var substituteType = searchResult[0].getText('custrecord_substitute_type1'); // Use getText to get the label (e.g., "SUPERSEDED") if it's a select field
                var substituteItemName = searchResult[0].getValue('formulatext');
                
                console.log('Substitute Item ID:', substituteItemId);
                console.log('Substitute Type:', substituteType);
                console.log('Substitute Item Name:', substituteItemName);

                if (substituteType === 'SUPERSEDED') {
                    console.log('Handling SUPERSEDED type');
                    dialog.alert({
                        title: 'Superseded Item',
                        message: 'The part "' + substituteItemName + '" supersedes this part and will be replaced in the sales order.'
                    }).then(function () {
                        console.log('Replacing item with:', substituteItemId);
                        salesOrder.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: substituteItemId
                        });
                    });
                } else if (substituteType === 'REPLACEMENT') {
                    console.log('Handling REPLACEMENT type');
                    dialog.confirm({
                        title: 'Replacement Item Available',
                        message: 'The part "' + substituteItemName + '" can replace this part. Would you like to replace it?'
                    }).then(function (confirmed) {
                        if (confirmed) {
                            console.log('User confirmed replacement, replacing with:', substituteItemId);
                            salesOrder.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: substituteItemId
                            });
                        } else {
                            console.log('User declined replacement');
                        }
                    });
                }
            } else {
                console.log('No substitute found for itemId:', itemId);
            }
        }
        return true;
    }

    return {
        validateLine: validateLine
    };
});