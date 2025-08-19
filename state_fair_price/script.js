/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/log'], (record, log) => {

    const beforeSubmit = (context) => {
        try {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                log.debug({
                    title: 'Script Skipped',
                    details: `Event type ${context.type} is not CREATE or EDIT`
                });
                return;
            }

            const rec = context.newRecord;
            log.debug({
                title: 'Processing Record',
                details: `Record Type: ${rec.type}, ID: ${rec.id}`
            });

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

            // Find the State Fair price (priceList ID 8)
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
                title: 'Script Error',
                details: `Error: ${e.message}, Stack: ${e.stack}`
            });
        }
    };

    return { beforeSubmit };
});