/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function (record, log) {

    function beforeLoad(context) {
        log.audit("replace-sku.js", "beforeLoad triggered. Context: " + context.type);
    }

    function beforeSubmit(context) {

        // Not logging inside Execution Log
        log.debug("replace-sku.js", "Script triggered");

        // Only run when the Sales Order is being created
        if (context.type !== context.UserEventType.CREATE) return;

        var salesOrder = context.newRecord;
        var lineCount = salesOrder.getLineCount({ sublistId: 'item' });

        // Original (discontinued) SKU -- INTERNAL ID
        var OLD_ITEM_ID = 63374;

        // Sandbox test INTERNAL ID -- The actual part number that is supposed to be replaced does not exist in Sandbox - only in production 
        var NEW_ITEM_ID = 24844;

        // const production_SKU = "F350";
        // const production_Internal_ID = 67803;


        // Iterate through sales order to find the intended ITEM ID
        for (var i = 0; i < lineCount; i++) {
            var itemId = salesOrder.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            // Not logging inside Execution Log
            log.debug("Checking line " + i, "Item ID: " + itemId);

            if (itemId == OLD_ITEM_ID) {
                log.debug("Match found", "Replacing item " + OLD_ITEM_ID + " with " + NEW_ITEM_ID);
                salesOrder.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i,
                    value: NEW_ITEM_ID
                });
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});
