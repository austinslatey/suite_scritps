/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget'], function (serverWidget) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var form = context.form;

            // Get the real field that exists on the record type
            var substituteTypeField = form.getField({
                id: 'custrecord_substitute_type1'
            });
            if (substituteTypeField) {
                substituteTypeField.label = 'Substitute Type';
                substituteTypeField.isMandatory = true;
            }
            console.log(substituteTypeField);
        }
    }



    return {
        beforeLoad: beforeLoad,
    };
});
