/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/dialog', 'N/log'], (record, dialog, log) => {

    function pageInit(context) {
        try {
            log.debug('Script Triggered', 'pageInit executed');
            const rec = context.currentRecord;
            updateStateFairPrice(rec);
        } catch (e) {
            log.error('pageInit Error', e.message + '\n' + e.stack);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred in pageInit: ' + e.message
            });
        }
    }

    function saveRecord(context) {
        try {
            log.debug('Script Triggered', 'saveRecord executed');
            const rec = context.currentRecord;
            updateStateFairPrice(rec);
            return true; // Allow save to proceed
        } catch (e) {
            log.error('saveRecord Error', e.message + '\n' + e.stack);
            dialog.alert({
                title: 'Error',
                message: 'An error occurred in saveRecord: ' + e.message
            });
            return false; // Optionally block save
        }
    }

    function updateStateFairPrice(rec) {
        try {
            log.debug('updateStateFairPrice', 'Starting price update');
            const lineCount = rec.getLineCount({ sublistId: 'price' });
            log.debug('Price Sublist', `Line Count: ${lineCount}`);

            if (lineCount === 0) {
                log.debug('No Price Lines', 'No lines found in price sublist');
                return;
            }

            let priceFound = false;
            for (let i = 0; i < lineCount; i++) {
                const priceLevel = rec.getSublistValue({
                    sublistId: 'price',
                    fieldId: 'pricelevel',
                    line: i
                });
                log.debug('Price Level Check', `Line: ${i}, Price Level: ${priceLevel}`);

                if (priceLevel == 8) { // State Fair price level
                    const priceValue = rec.getSublistValue({
                        sublistId: 'price',
                        fieldId: 'price',
                        line: i
                    });
                    log.debug('State Fair Price Found', `Line: ${i}, Price: ${priceValue}`);

                    rec.setValue({
                        fieldId: 'custitem_state_fairprice',
                        value: priceValue
                    });
                    log.debug('State Fair Price Set', `Set custitem_state_fairprice to ${priceValue}`);
                    priceFound = true;
                    break;
                }
            }

            if (!priceFound) {
                log.debug('No State Fair Price', 'No price found for State Fair price level (ID 8)');
            }
        } catch (e) {
            log.error('updateStateFairPrice Error', e.message + '\n' + e.stack);
            throw e;
        }
    }

    return { pageInit, saveRecord };
});