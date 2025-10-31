/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/email', 'N/runtime', 'N/log'],
    (record, email, runtime, log) => {

        const afterSubmit = (context) => {
            try {
                if (context.type !== context.UserEventType.CREATE) return;

                const rec = context.newRecord;
                const poId = rec.getValue('createdfrom');
                if (!poId) return; // only act on Item Receipts from POs

                // Load linked Purchase Order
                const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
                const poNum = po.getValue('tranid');
                const creatorId = po.getValue('createdby');
                const salesRepId = po.getValue('salesrep');

                const subject = `Item(s) Received for Purchase Order ${poNum}`;
                const body = `
                <p>Hello,</p>
                <p>Items have been received against PO <strong>${poNum}</strong>.</p>
                <p><a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View PO</a></p>
            `;

                const recipients = [];
                if (creatorId) recipients.push(creatorId);
                if (salesRepId && salesRepId !== creatorId) recipients.push(salesRepId);

                if (recipients.length > 0) {
                    recipients.forEach(r => {
                        email.send({
                            author: runtime.getCurrentUser().id,
                            recipients: r,
                            subject: subject,
                            body: body
                        });
                    });
                    log.audit('PO Notification Sent', `PO ${poNum} → ${recipients.join(', ')}`);
                } else {
                    log.audit('No Recipients Found', `PO ${poNum}`);
                }
            } catch (e) {
                log.error('Item Receipt Notification Error', e);
            }
        };

        return { afterSubmit };
    });
