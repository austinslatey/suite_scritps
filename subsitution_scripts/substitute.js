/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/search', 'N/log'], function (record, dialog, search, log) {
    var isReplacing = false; // Flag to prevent potential recursion

    /**
     * Converts item identifier (itemid or custitem_nscs_ext_id_view, e.g., 100-002 or 32517) to internal ID (e.g., 26875)
     * @param {string} itemIdentifier - The itemid or custom external ID from the sales order item field
     * @returns {string|null} - The internal ID of the item, or null if not found
     */
    function getItemInternalId(itemIdentifier) {
        try {
            if (!itemIdentifier || typeof itemIdentifier !== 'string') {
                log.debug({
                    title: 'getItemInternalId',
                    details: 'Invalid item identifier: ' + JSON.stringify(itemIdentifier)
                });
                return null;
            }

            // Search using itemid first, then custitem_nscs_ext_id_view for sandbox
            var itemSearch = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['itemid', 'is', itemIdentifier],
                    'OR',
                    ['custitem_nscs_ext_id_view', 'is', itemIdentifier],
                    'AND',
                    ['isinactive', 'is', false]
                ],
                columns: ['internalid', 'itemid', 'custitem_nscs_ext_id_view']
            });

            var result = itemSearch.run().getRange({ start: 0, end: 1 });
            if (result.length > 0) {
                var internalId = result[0].getValue('internalid');
                var matchedItemId = result[0].getValue('itemid');
                var matchedCustomExtId = result[0].getValue('custitem_nscs_ext_id_view');
                log.debug({
                    title: 'getItemInternalId',
                    details: 'Found internal ID: ' + internalId + ' for item identifier: ' + itemIdentifier +
                            ', matched itemid: ' + matchedItemId + ', matched custitem_nscs_ext_id_view: ' + matchedCustomExtId
                });
                return internalId;
            } else {
                log.debug({
                    title: 'getItemInternalId',
                    details: 'No item found for item identifier: ' + itemIdentifier
                });
                return null;
            }
        } catch (e) {
            log.error({
                title: 'Error in getItemInternalId',
                details: 'Item identifier: ' + itemIdentifier + ', Error: ' + e.name + ', Message: ' + e.message
            });
            return null;
        }
    }

    function fieldChanged(context) {
        try {
            log.debug({
                title: 'Entering fieldChanged',
                details: 'sublistId: ' + context.sublistId + ', fieldId: ' + context.fieldId + ', salesOrder: ' + context.currentRecord.id
            });

            if (isReplacing) {
                log.debug({ title: 'Skipping fieldChanged', details: 'Ongoing replacement' });
                return;
            }

            var salesOrder = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;

            if (sublistId === 'item' && fieldId === 'item') {
                var itemIdentifier = salesOrder.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                log.debug({ title: 'Item Field Changed', details: 'Item identifier: ' + itemIdentifier });

                // Validate item identifier
                if (!itemIdentifier || typeof itemIdentifier !== 'string') {
                    log.debug({
                        title: 'Invalid Item Identifier',
                        details: 'Item identifier is invalid or empty: ' + JSON.stringify(itemIdentifier)
                    });
                    return;
                }

                // Convert item identifier to internal ID
                var itemId = getItemInternalId(itemIdentifier);
                if (!itemId) {
                    log.debug({
                        title: 'No Internal ID',
                        details: 'Could not find internal ID for item identifier: ' + itemIdentifier
                    });
                    return;
                }

                // Get sales order location if set
                var locationId = salesOrder.getValue({ fieldId: 'location' });
                log.debug({ title: 'Location', details: 'Sales Order Location ID: ' + locationId });

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

                log.debug({ title: 'Inventory Search', details: 'Running inventory search for item ID: ' + itemId });
                var inventoryResult = inventorySearch.run().getRange({ start: 0, end: 1 });
                log.debug({ title: 'Inventory Results', details: 'Results: ' + JSON.stringify(inventoryResult) });

                var onHand = inventoryResult.length > 0 ? inventoryResult[0].getValue('quantityonhand') || '0' : '0';
                var available = inventoryResult.length > 0 ? inventoryResult[0].getValue('quantityavailable') || '0' : '0';
                log.debug({ title: 'Inventory Details', details: 'On Hand: ' + onHand + ', Available: ' + available });

                // Search for substitute items
                log.debug({ title: 'Substitute Search', details: 'Creating substitute search for item ID: ' + itemId });
                var substituteSearch = search.create({
                    type: 'customrecord_scm_item_substitute',
                    filters: [
                        ['custrecord_scm_itemsub_parent', 'is', itemId],
                        'AND',
                        ['isinactive', 'is', false]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_scm_itemsub_substitute' }),
                        search.createColumn({ name: 'custrecordcustrecord_substitute_type1' }),
                        search.createColumn({
                            name: 'formulatext',
                            formula: '{custrecord_scm_itemsub_substitute.itemid}',
                            label: 'Substitute Item Number'
                        }),
                        search.createColumn({
                            name: 'formulatext',
                            formula: '{custrecord_scm_itemsub_substitute.salesdescription}',
                            label: 'Sales Description'
                        })
                    ]
                });

                log.debug({ title: 'Substitute Search', details: 'Running substitute search' });
                var searchResult = substituteSearch.run().getRange({ start: 0, end: 1 });
                log.debug({ title: 'Substitute Results', details: 'Results: ' + JSON.stringify(searchResult) });

                if (searchResult.length > 0) {
                    var substituteItemId = searchResult[0].getValue('custrecord_scm_itemsub_substitute');
                    var substituteType = searchResult[0].getText('custrecordcustrecord_substitute_type1');
                    var substituteItemName = searchResult[0].getValue({ name: 'formulatext', summary: null });
                    var salesDescription = searchResult[0].getValue({ name: 'formulatext', summary: null, index: 1 });

                    log.debug({
                        title: 'Substitute Found',
                        details: 'ID: ' + substituteItemId + ', Type: ' + substituteType + ', Name: ' + substituteItemName + ', Description: ' + salesDescription
                    });

                    var replace = false;
                    isReplacing = true; // Set flag before replacement

                    if (substituteType === 'Superseded') {
                        log.debug({ title: 'Superseded Item', details: 'Prompting for replacement' });
                        window.alert('The part "' + substituteItemName + '" (' + salesDescription + ') supersedes this part and will be replaced in the sales order.');
                        replace = true;
                    } else if (substituteType === 'Replacement') {
                        log.debug({ title: 'Replacement Item', details: 'Prompting user for confirmation' });
                        var stockMessage = 'The part "' + substituteItemName + '" can replace this part. The current item has ' + onHand + ' on hand and ' + available + ' available. Would you like to replace it?';
                        var confirmed = window.confirm(stockMessage);
                        if (confirmed) {
                            replace = true;
                            log.debug({ title: 'Replacement Confirmed', details: 'User approved replacement' });
                        } else {
                            log.debug({ title: 'Replacement Declined', details: 'User declined replacement' });
                        }
                    }

                    if (replace) {
                        log.debug({ title: 'Replacing Item', details: 'Setting new item ID: ' + substituteItemId });
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
                            fieldId: 'custcol_custom_mpn', // Assuming custom column
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
                    log.debug({ title: 'No Substitute', details: 'No substitute found for item ID: ' + itemId });
                }
            }
        } catch (e) {
            log.error({
                title: 'Error in fieldChanged',
                details: 'Error: ' + e.name + ', Message: ' + e.message + ', Stack: ' + e.stack
            });
            // Optionally notify user
            // window.alert('An error occurred while processing the item substitution. Please contact support.');
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});