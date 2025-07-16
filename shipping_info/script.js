/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'], (record, search, email, runtime, log) => {

  const afterSubmit = (context) => {
    log.debug('User Event Script', 'afterSubmit triggered');

    if (context.type !== context.UserEventType.CREATE &&
        context.type !== context.UserEventType.EDIT) {
      log.debug('Exit', `Context type is ${context.type}, not CREATE or EDIT`);
      return;
    }

    const fulfillment = context.newRecord;
    const salesOrderId = fulfillment.getValue('createdfrom');
    log.debug('Sales Order ID', salesOrderId);

    if (!salesOrderId) {
      log.debug('Exit', 'No related Sales Order ID found');
      return;
    }

    const packageCount = fulfillment.getLineCount({ sublistId: 'package' });
    log.debug('Package Count', packageCount);

    if (packageCount === 0) {
      log.debug('Exit', 'No packages found on fulfillment');
      return;
    }

    const trackingNumber = fulfillment.getSublistValue({
      sublistId: 'package',
      fieldId: 'trackingnumber',
      line: 0
    });
    log.debug('Tracking Number', trackingNumber);

    if (!trackingNumber) {
      log.debug('Exit', 'No tracking number found in first package');
      return;
    }

    try {
      // Update Sales Order with tracking number
      record.submitFields({
        type: record.Type.SALES_ORDER,
        id: salesOrderId,
        values: {
          custbody_tracking_number: trackingNumber
        }
      });
      log.debug('Sales Order Updated', `Tracking number ${trackingNumber} saved`);
    } catch (e) {
      log.error('Error updating sales order', e);
      return;
    }

    let salesOrder;
    try {
      salesOrder = record.load({
        type: record.Type.SALES_ORDER,
        id: salesOrderId,
        isDynamic: false
      });
    } catch (e) {
      log.error('Error loading sales order', e);
      return;
    }

    const customerId = salesOrder.getValue({ fieldId: 'entity' });
    const customerEmail = salesOrder.getValue({ fieldId: 'email' });
    log.debug('Customer Info', `ID: ${customerId}, Email: ${customerEmail}`);

    if (!customerEmail) {
      log.debug('Exit', 'No customer email found');
      return;
    }

    const subject = `Your Order Has Shipped`;
    const body = `Hello,<br><br>Your order has shipped!<br><br>Tracking Number: <strong>${trackingNumber}</strong><br><br>Thank you for your business!`;

    try {
      email.send({
        author: runtime.getCurrentUser().id,
        recipients: customerEmail,
        subject: subject,
        body: body,
        relatedRecords: {
          transactionId: salesOrderId,
          entityId: customerId
        }
      });
      log.debug('Email Sent', `Email sent to ${customerEmail}`);
    } catch (e) {
      log.error('Error sending email', e);
    }
  };

  return { afterSubmit };
});


