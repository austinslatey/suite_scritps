/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/currentRecord', 'N/log'], (currentRecord, log) => {

    const pageInit = (context) => {
        try {
            const rec = context.currentRecord;
            log.debug({
                title: 'Client Script: pageInit',
                details: `Record Type: ${rec.type}, ID: ${rec.id}`
            });
            updateStateFairPrice(rec);
        } catch (e) {
            log.error({
                title: 'pageInit Error',
                details: `Error: ${e.message}, Stack: ${e.stack}`
            });
        }
    };

    const fieldChanged = (context) => {
        try {
            const rec = context.currentRecord;
            const fieldId = context.fieldId;
            log.debug({
                title: 'Client Script: fieldChanged',
                details: `Field Changed: ${fieldId}`
            });

            // Trigger on changes to pricing-related fields
            if (fieldId === 'pricingMatrix' || fieldId.includes('price')) {
                updateStateFairPrice(rec);
            }
        } catch (e) {
            log.error({
                title: 'fieldChanged Error',
                details: `Error: ${e.message}, Stack: ${e.stack}`
            });
        }
    };

    const updateStateFairPrice = (rec) => {
        try {
            // Access the pricing matrix
            const pricingMatrix = rec.getValue({ fieldId: 'pricingMatrix' });
            log.debug({
                title: 'Pricing Matrix',
                details: `Pricing Matrix: ${JSON.stringify(pricingMatrix)}`
            });

            if (!pricingMatrix || !pricingMatrix.pricing || !pricingMatrix.pricing.priceList) {
                log.error({
                    title: 'Pricing Matrix Error',
                    details: 'Pricing matrix or priceList is undefined or empty'
                });
                return;
            }

            // Find the State Fair price (priceLevel ID 8)
            const stateFairPrice = pricingMatrix.pricing.priceList.find(price => price.priceLevel === '8');

            if (stateFairPrice && stateFairPrice.price && stateFairPrice.price.value) {
                const priceValue = stateFairPrice.price.value;
                log.debug({
                    title: 'State Fair Price Found',
                    details: `Price Level ID 8 found with price: ${priceValue}`
                });

                // Set the custom field
                rec.setValue({
                    fieldId: 'custitem_state_fair_price',
                    value: priceValue
                });

                log.audit({
                    title: 'Field Updated',
                    details: `Set custitem_state_fair_price to ${priceValue}`
                });
            } else {
                log.error({
                    title: 'State Fair Price Not Found',
                    details: 'No price found for price level ID 8 in pricingMatrix'
                });
            }
        } catch (e) {
            log.error({
                title: 'updateStateFairPrice Error',
                details: `Error: ${e.message}, Stack: ${e.stack}`
            });
        }
    };

    return {
        pageInit,
        fieldChanged
    };
});