/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/log'], function (currentRecord, log) {

    function validateLine(context) {
        var rec = currentRecord.get();
        var sublistName = context.sublistId;

        if (sublistName !== 'item') return true;

        var OLD_ITEM_ID = 63374;   // Discontinued SKU internal ID
        var NEW_ITEM_ID = 24844;   // Replacement SKU internal ID

        var itemId = Number(rec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item'
        }));

        log.audit("Checking current line", "Item ID: " + itemId);

        if (itemId === OLD_ITEM_ID) {
            log.audit("Match found", "Replacing discontinued item ID " + OLD_ITEM_ID + " with " + NEW_ITEM_ID);

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: NEW_ITEM_ID
            });
        }

        return true;
    }

    return {
        validateLine: validateLine
    };
});