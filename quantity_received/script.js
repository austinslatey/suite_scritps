/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'],
(record, search, email, runtime, log) => {

    const execute = (context) => {
        try {
            log.debug('Scheduled Script Start', `Triggered at ${new Date().toISOString()}`);

            // 1. Search for all Item Receipts created in the last 7 days (adjust as needed)
            const irSearch = search.create({
                type: record.Type.ITEM_RECEIPT,
                filters: [
                    ['createddate', 'onorafter', '7/1/2025']
                ],
                columns: ['internalid', 'createdfrom']
            });

            const results = irSearch.run().getRange({ start: 0, end: 100 });

            if (!results || results.length === 0) {
                log.debug('Scheduled Script', 'No Item Receipts found');
                return;
            }

            results.forEach(result => {
                const irId = result.getValue('internalid');
                const poId = result.getValue('createdfrom');

                log.debug('Processing IR', `IR ID: ${irId} | PO: ${poId}`);

                if (!poId) return;

                // Load IR dynamically
                const ir = record.load({ type: record.Type.ITEM_RECEIPT, id: irId, isDynamic: true });

                const lineCount = ir.getLineCount({ sublistId: 'item' });
                const newReceivedLines = [];

                for (let i = 0; i < lineCount; i++) {
                    const qtyReceived = ir.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    const notifSent = ir.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ir_notif_sent', line: i });

                    if (qtyReceived > 0 && !notifSent) {
                        const itemName = ir.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                        newReceivedLines.push({ line: i, itemName, qtyReceived });
                    }
                }

                if (newReceivedLines.length === 0) return;

                // Load linked PO
                const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
                const poNum = po.getValue('tranid');
                const creatorId = po.getValue('createdby');
                const salesRepId = po.getValue('salesrep');

                const recipients = [creatorId, salesRepId].filter(Boolean);

                if (recipients.length === 0) {
                    log.audit('No Recipients Found', `IR ${irId} → PO ${poNum}`);
                    return;
                }

                // Build email body
                let body = `<p>Hello,</p><p>The following items have been received for PO <strong>${poNum}</strong>:</p><ul>`;
                newReceivedLines.forEach(line => {
                    body += `<li>${line.itemName} — Quantity Received: ${line.qtyReceived}</li>`;
                });
                body += `</ul><p><a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View PO</a></p>`;

                // DEBUG: Log instead of sending email
                log.audit('Would send email', `IR ${irId} → PO ${poNum} → Recipients: ${recipients.join(', ')}`);
                // Uncomment to send for real
                /*
                recipients.forEach(r => {
                    email.send({
                        author: runtime.getCurrentUser().id,
                        recipients: r,
                        subject: `Item(s) Received for Purchase Order ${poNum}`,
                        body: body
                    });
                });
                */

                // Mark lines as notified
                newReceivedLines.forEach(line => {
                    ir.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ir_notif_sent',
                        line: line.line,
                        value: true
                    });
                });

                ir.save();
            });

        } catch (e) {
            log.error('Scheduled Script Error', e);
        }
    };

    return { execute };
});
