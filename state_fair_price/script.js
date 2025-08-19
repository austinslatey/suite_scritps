/**
 * @NApiVersion 1.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Copies Price Level 8 (State Fair) into top-level field custitem_state_fair_price
 */

function copyStateFairPrice(type) {
    if (type !== 'create' && type !== 'edit') return;

    // Get the current record
    var rec = nlapiGetNewRecord();

    // Get total price lines
    var lineCount = rec.getLineItemCount('price');

    // Loop through price matrix
    for (var i = 1; i <= lineCount; i++) {
        var priceLevelId = rec.getLineItemValue('price', 'pricelevel', i);

        // Check for Price Level 8 (State Fair)
        if (priceLevelId == '8') {
            var priceValue = rec.getLineItemValue('price', 'price', i);

            // Set top-level custom field
            rec.setFieldValue('custitem_state_fair_price', priceValue);
            break; // stop after first match
        }
    }
}
