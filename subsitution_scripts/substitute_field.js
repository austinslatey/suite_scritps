/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/ui/serverWidget', 'N/log'], function (record, serverWidget, log) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var form = context.form;
            var itemRecord = context.newRecord;

            log.debug({
                title: 'Before Load',
                details: 'Processing Inventory Item form, type: ' + context.type + ', record ID: ' + (itemRecord.id || 'New')
            });

            // Ensure the Substitutes sublist has the custom field
            var sublist = form.getSublist({ id: 'itemsubstitution' });
            if (sublist) {
                var substituteTypeField = sublist.addField({
                    id: 'custpage_substitute_type',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Substitute Type',
                    source: 'customlist_substitute_type'
                });
                substituteTypeField.isMandatory = true;
            } else {
                log.error({
                    title: 'Sublist Not Found',
                    details: 'Substitutes sublist (itemsubstitution) not found on form'
                });
            }
        }
    }

    function beforeSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var itemRecord = context.newRecord;
            var sublistLineCount = itemRecord.getLineCount({ sublistId: 'itemsubstitution' });

            log.debug({
                title: 'Before Submit',
                details: 'Processing Inventory Item, ID: ' + (itemRecord.id || 'New') + ', Substitute Lines: ' + sublistLineCount
            });

            for (var i = 0; i < sublistLineCount; i++) {
                var formValue = itemRecord.getSublistValue({
                    sublistId: 'itemsubstitution',
                    fieldId: 'custpage_substitute_type',
                    line: i
                });

                log.debug({
                    title: 'Before Submit Line ' + (i + 1),
                    details: 'Form value of custpage_substitute_type: ' + formValue
                });

                if (formValue) {
                    itemRecord.setSublistValue({
                        sublistId: 'itemsubstitution',
                        fieldId: 'custitem_substitute_type',
                        line: i,
                        value: formValue
                    });
                    log.debug({
                        title: 'Saving Substitute Type',
                        details: 'Set custitem_substitute_type to: ' + formValue + ' on line ' + (i + 1)
                    });
                } else {
                    throw new Error('Substitute Type is required on line ' + (i + 1) + '.');
                }
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
});