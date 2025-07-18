/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/log'], function (currentRecord, log) {

    function validateLine(context) {
        var rec = currentRecord.get();
        var sublistName = context.sublistId;

        if (sublistName === 'item') {
            var itemId = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });

            if (itemId == '63374') {
                log.debug('Replacing discontinued item', 'Replacing item 63374 with 67803');

                // Replace item
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: '67803'
                });

                // Set new description (or blank to auto-populate from item record)
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    // blank means it should pull from item record if configured
                    value: ''
                });

                // Clear rate so pricing can recalculate, or hardcode if necessary
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: ''
                });

                // Clear MPN
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custitemcustom_mpn',
                    value: ''
                });
            }
        }

        return true;
    }

    function fieldChanged(context) {
        var rec = currentRecord.get();
        var sublistName = context.sublistId;
        var fieldId = context.fieldId;

        if (sublistName === 'item' && fieldId === 'item') {
            var itemId = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });

            if (itemId == '63374') {
                log.debug('Item changed - replacing discontinued item early', 'Replacing item 63374 with 67803');

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: '67803'
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    value: ''
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: ''
                });

                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custitemcustom_mpn',
                    value: ''
                });
            }
        }
    }

    return {
        validateLine: validateLine,
        fieldChanged: fieldChanged
    };
});
