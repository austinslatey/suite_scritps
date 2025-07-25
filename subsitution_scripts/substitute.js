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

            // Get sales order location if set
            var locationId = salesOrder.getValue({ fieldId: 'location' });
            console.log('Sales Order Location ID:', locationId);

            // Search for initial item's inventory details
            var inventoryFilters = [
                ['internalid', 'is', itemId],
                'AND',
                ['isinactive', 'is', false]
            ];
            if (locationId) {
                inventoryFilters.push('AND');
                inventoryFilters.push(['location', 'is', locationId]);
            }

            var inventorySearch = search.create({
                type: search.Type.INVENTORY_ITEM,
                filters: inventoryFilters,
                columns: [
                    search.createColumn({ name: 'quantityonhand', label: 'On Hand' }),
                    search.createColumn({ name: 'quantityavailable', label: 'Available' })
                ]
            });

            console.log('Running inventory search');
            var inventoryResult = inventorySearch.run().getRange({ start: 0, end: 1 });
            console.log('Inventory search results:', inventoryResult);

            var onHand = inventoryResult.length > 0 ? inventoryResult[0].getValue('quantityonhand') || '0' : '0';
            var available = inventoryResult.length > 0 ? inventoryResult[0].getValue('quantityavailable') || '0' : '0';
            console.log('Initial Item On Hand:', onHand, 'Available:', available);

            // Search for substitute items
            console.log('Creating substitute search');
            var substituteSearch = search.create({
                type: 'customrecord_scm_item_substitute',
                filters: [
                    ['custrecord_scm_itemsub_parent', 'is', itemId],
                    'AND',
                    ['isinactive', 'is', false]
                ],
                columns: [
                    search.createColumn({ name: 'custrecord_scm_itemsub_substitute' }),
                    search.createColumn({ name: 'Custrecordcustrecord_substitute_type1' }),
                    search.createColumn({
                        name: 'formulatext',
                        formula: '{custrecord_scm_itemsub_substitute.itemid}',
                        label: 'Substitute Item Number'
                    }),
                    search.createColumn({
                        name: 'formulatext2',
                        formula: '{custrecord_scm_itemsub_substitute.salesdescription}',
                        label: 'Sales Description'
                    })
                ]
            });

            console.log('Running substitute search');
            var searchResult = substituteSearch.run().getRange({ start: 0, end: 1 });
            console.log('Search results:', searchResult);

            if (searchResult.length > 0) {
                var substituteItemId = searchResult[0].getValue('custrecord_scm_itemsub_substitute');
                var substituteType = searchResult[0].getText('Custrecordcustrecord_substitute_type1');
                var substituteItemName = searchResult[0].getValue('formulatext');
                var salesDescription = searchResult[0].getValue('formulatext2');

                console.log('Substitute Item ID:', substituteItemId);
                console.log('Substitute Type:', substituteType);
                console.log('Substitute Item Name:', substituteItemName);
                console.log('Sales Description:', salesDescription);

                var replace = false;

                isReplacing = true; // Set flag before replacement

                if (substituteType === 'Superseded') {
                    console.log('Handling SUPERSEDED type');
                    window.alert('The part "' + substituteItemName + '" (' + salesDescription + ') supersedes this part and will be replaced in the sales order.');
                    replace = true;
                } else if (substituteType === 'Replacement') {
                    console.log('Handling REPLACEMENT type');
                    var stockMessage = 'The part "' + substituteItemName + '" can replace this part. The current item has ' + onHand + ' on hand and ' + available + ' available. Would you like to replace it?';
                    var confirmed = window.confirm(stockMessage);
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

                    // Clear fields to force re-sourcing
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
                        fieldId: 'custitemcustom_mpn', // Adjust to 'custcol_custom_mpn' if it's a line field
                        value: ''
                    });

                    // Reset quantity to trigger inventory field updates
                    var qty = salesOrder.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity'
                    }) || 1;
                    salesOrder.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: qty
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