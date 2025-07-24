/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/search'], function (record, dialog, search) {
    var isReplacing = false; // Flag to prevent potential recursion

    function fieldChanged(context) {
        console.log('Entering fieldChanged function');

        if (isReplacing) {
            console.log('Skipping due to ongoing replacement');
            return;
        }

        var salesOrder = context.currentRecord;
        var sublistId = context.sublistId;
        var fieldId = context.fieldId;

        if (sublistId === 'item' && fieldId === 'item') {
            var itemId = salesOrder.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            console.log('Current itemId:', itemId);

            // Search for substitute items
            console.log('Creating substitute search');
            var substituteSearch = search.create({
                type: 'customrecord_scm_item_substitute', // Use the confirmed type
                filters: [
                    ['custrecord_scm_itemsub_parent', 'is', itemId], // Parent field ID
                    'AND',
                    ['isinactive', 'is', false]
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_scm_itemsub_substitute' }), // Substitute item field
                    search.createColumn({ name: 'custrecord_substitute_type1' }), // Substitute type field
                    search.createColumn({
                        name: 'formulatext',
                        formula: '{custrecord_scm_itemsub_substitute.itemid}', // Formula for item number
                        label: 'Substitute Item Number'
                    }),
                    search.createColumn({
                        name: 'formulatext2',
                        formula: '{custrecord_scm_itemsub_substitute.salesdescription}', // Formula for sales description
                        label: 'Sales Description'
                    })
                ]
            });

            console.log('Running search');
            var searchResult = substituteSearch.run().getRange({ start: 0, end: 1 });
            console.log('Search results:', searchResult);

            if (searchResult.length > 0) {
                var substituteItemId = searchResult[0].getValue('custrecord_scm_itemsub_substitute');
                var substituteType = searchResult[0].getText('custrecord_substitute_type1');
                var substituteItemName = searchResult[0].getValue('formulatext'); // Item number
                var salesDescription = searchResult[0].getValue('formulatext2'); // Sales description

                console.log('Substitute Item ID:', substituteItemId);
                console.log('Substitute Type:', substituteType);
                console.log('Substitute Item Name:', substituteItemName);
                console.log('Sales Description:', salesDescription);

                var replace = false;

                isReplacing = true; // Set flag before replacement

                if (substituteType === 'SUPERSEDED') {
                    console.log('Handling SUPERSEDED type');
                    window.alert('The part "' + substituteItemName + '" (' + salesDescription + ') supersedes this part and will be replaced in the sales order.');
                    replace = true;
                } else if (substituteType === 'REPLACEMENT') {
                    console.log('Handling REPLACEMENT type');
                    var confirmed = window.confirm('The part "' + substituteItemName + '" (' + salesDescription + ') can replace this part. Would you like to replace it?');
                    if (confirmed) {
                        replace = true;
                    } else {
                        console.log('User declined replacement');
                    }
                }

                if (replace) {
                    console.log('Replacing item with:', substituteItemId);
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: substituteItemId
                    });

                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: ''
                    });

                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: ''
                    });

                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custitemcustom_mpn',
                        value: ''
                    });

                }

                isReplacing = false; // Reset flag after replacement
            } else {
                console.log('No substitute found for itemId:', itemId);
            }
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});