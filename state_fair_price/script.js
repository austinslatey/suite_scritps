/**
 * User Event Script - Before Submit
 */
function copyStateFairPrice(type) {
    if (type !== 'create' && type !== 'edit') return;

    var rec = nlapiGetNewRecord();
    var lineCount = rec.getLineItemCount('price');

    for (var i = 1; i <= lineCount; i++) {
        var priceLevelId = rec.getLineItemValue('price', 'pricelevel', i);
        if (priceLevelId == '8') { // State Fair Price Level ID
            var priceValue = rec.getLineItemValue('price', 'price', i);
            rec.setFieldValue('custitem_state_fair_price', priceValue);
            break;
        }
    }
}