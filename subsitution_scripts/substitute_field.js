/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/serverWidget'], function(record, serverWidget) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var form = context.form;

            // Add custom field to Item Substitute form with custpage prefix
            var substituteTypeField = form.addField({
                id: 'custpage_substitute_type',
                type: serverWidget.FieldType.SELECT,
                label: 'Substitute Type',
                source: 'customlist_substitute_type' // Reference the custom list
            });

            substituteTypeField.isMandatory = true;
        }
    }

    function beforeSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var substituteRecord = context.newRecord;
            var substituteType = substituteRecord.getValue('custpage_substitute_type');

            // Store the form field value in the custom record field
            if (substituteType) {
                substituteRecord.setValue({
                    fieldId: 'custrecord_substitute_type',
                    value: substituteType
                });
            } else {
                throw new Error('Substitute Type is required.');
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});