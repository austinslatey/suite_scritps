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

        /**
         * SKU Mapping
         * -----------
         * OLD SKU: Discontinued item
         *   - internalId: 63374
         *   - itemName: 62080
         *   - displayName: "26001SWC Waldoch Full Length Flare Boards For Ford E Series Vans 26001"
         *
         * NEW SKU (Sandbox test):
         *   - internalId: 24844
         *   - itemName: 30759
         *   - externalId: "MS-RA670"
         *   - displayName: "MS-RA670 Apollo Marine Entertainment System 3 Zones SiriusXM Ready Fusion"
         *
         * PRODUCTION SKU:
         *   - internalId: 67803
         *   - itemName: "F350"
         *   - displayName: "BREMEN FULL LENGTH FLARE BOARDS FOR FORD E SERIES VANS"
         */

        var OLD_ITEM_ID = 63374;    // Discontinued item
        var NEW_ITEM_ID = 24844;    // Sandbox substitute for F350 (production ID: 67803)


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
