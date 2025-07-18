/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search', 'N/record'], function(search, record) {

  function validateLine(context) {
    const currentRecord = context.currentRecord;
    const sublistName = context.sublistId;

    if (sublistName !== 'item') return true;

    const itemId = currentRecord.getCurrentSublistValue({
      sublistId: 'item',
      fieldId: 'item'
    });

    if (!itemId) return true;

    // Load the item record to check inventory and substitute
    const item = record.load({
      type: record.Type.INVENTORY_ITEM,
      id: itemId,
      isDynamic: false
    });

    const quantityAvailable = item.getValue('quantityavailable');
    const substituteItemId = item.getValue('custitem_substitute_item'); // Custom field with alternate item

    if (quantityAvailable === 0 && substituteItemId) {
      alert('Original item is out of stock. Substituting with alternate item.');
      currentRecord.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: substituteItemId
      });
    }

    return true;
  }

  return {
    validateLine: validateLine
  };
});