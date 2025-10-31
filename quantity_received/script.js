/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/runtime', 'N/email', 'N/search', 'N/log'],
    (record, runtime, email, search, log) => {

        const afterSubmit = (context) => {
            try {
                if (context.type !== context.UserEventType.EDIT) return;

                const newRec = context.newRecord;
                const oldRec = context.oldRecord;

                const lineCount = newRec.getLineCount({ sublistId: 'item' });
                let itemReceived = false;
                let itemDetails = [];

                for (let i = 0; i < lineCount; i++) {
                    const newQtyReceived = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: i }) || 0;
                    const oldQtyReceived = oldRec.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: i }) || 0;

                    if (oldQtyReceived === 0 && newQtyReceived >= 1) {
                        itemReceived = true;

                        const itemName = newRec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                        const qtyOrdered = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        itemDetails.push(`${itemName} (${newQtyReceived}/${qtyOrdered})`);
                    }
                }

                if (itemReceived) {
                    const poId = newRec.id;
                    const poTranId = newRec.getValue('tranid');
                    const creatorId = newRec.getValue('createdby');
                    const salesRepId = newRec.getValue('salesrep');

                    const subject = `Items Received for PO #${poTranId}`;
                    const body = `
                        <p>Hello,</p>
                        <p>The following items have arrived in the warehouse for Purchase Order <strong>${poTranId}</strong>:</p>
                        <ul>${itemDetails.map(i => `<li>${i}</li>`).join('')}</ul>
                        <p><a href="https://YOURACCOUNTID.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View Purchase Order</a></p>
                        <p>-- NetSuite Notification</p>
                    `;

                    // Send email to both the creator and sales rep
                    const recipients = [];
                    if (creatorId) recipients.push(creatorId);
                    if (salesRepId && salesRepId !== creatorId) recipients.push(salesRepId);

                    recipients.forEach(recipientId => {
                        email.send({
                            author: runtime.getCurrentUser().id,
                            recipients: recipientId,
                            subject: subject,
                            body: body
                        });
                    });

                    log.audit('PO Notification Sent', `Recipients: ${recipients.join(', ')}`);
                }

            } catch (e) {
                log.error('Error in afterSubmit', e);
            }
        };

        return { afterSubmit };
    });
