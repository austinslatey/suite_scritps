/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/serverWidget'], function(record, serverWidget) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var form = context.form;
            var substituteRecord = context.newRecord;

            // Add custom field to Item Substitute page
            var substituteTypeField = form.addField({
                id: 'custrecord_substitute_type',
                type: serverWidget.FieldType.SELECT,
                label: 'Substitute Type',
                source: null
            });
            
            substituteTypeField.addSelectOption({
                value: '',
                text: ''
            });
            substituteTypeField.addSelectOption({
                value: 'SUPERSEDED',
                text: 'Superseded'
            });
            substituteTypeField.addSelectOption({
                value: 'REPLACEMENT',
                text: 'Replacement'
            });

            substituteTypeField.isMandatory = true;
        }
    }

    function beforeSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var substituteRecord = context.newRecord;
            var substituteType = substituteRecord.getValue('custrecord_substitute_type');
            
            if (!substituteType) {
                throw new Error('Substitute Type is required.');
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});