/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/record'], (record) => {

    const beforeSubmit = (context) => {
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            return;
        }

        const rec = context.newRecord;
        const lineCount = rec.getLineCount({ sublistId: 'price' });

        for (let i = 0; i < lineCount; i++) {
            const priceLevelId = rec.getSublistValue({
                sublistId: 'price',
                fieldId: 'pricelevel',
                line: i
            });

            if (priceLevelId == 8) { // State Fair Price Level
                const priceValue = rec.getSublistValue({
                    sublistId: 'price',
                    fieldId: 'price',
                    line: i
                });

                rec.setValue({
                    fieldId: 'custitem_state_fair_price',
                    value: priceValue
                });

                break; // stop after first match
            }
        }
    };

    return { beforeSubmit };
});