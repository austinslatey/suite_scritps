/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log'], (log) => {
  function afterSubmit(context) {
    log.audit('My UE Script', 'It ran! Record ID: ' + context.newRecord.id);
  }
  return { afterSubmit };
});
