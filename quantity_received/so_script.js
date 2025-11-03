/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'],
    (record, search, email, runtime, log) => {

        const execute = () => {
            try {
                log.debug('Scheduled Script Start', `Triggered at ${new Date().toISOString()}`);

                const startDate = '10/01/2025';
                const maxResults = 100;

                // ---------- SEARCH ITEM RECEIPTS ----------
                const irSearch = search.create({
                    type: record.Type.ITEM_RECEIPT,
                    filters: [['trandate', 'onorafter', startDate]],
                    columns: ['internalid', 'createdfrom']
                });

                const results = irSearch.run().getRange({ start: 0, end: maxResults });
                if (!results || results.length === 0) {
                    log.debug('Scheduled Script', 'No Item Receipts found for processing.');
                    return;
                }

                // ---------- PROCESS EACH ITEM RECEIPT ----------
                results.forEach(result => {
                    try {
                        const irId = result.getValue('internalid');
                        const poId = result.getValue('createdfrom');

                        if (!poId) return;

                        log.debug('Processing IR Start', `IR ID: ${irId}, PO: ${poId}`);

                        const ir = record.load({ type: record.Type.ITEM_RECEIPT, id: irId, isDynamic: false });
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

                        // ---------- LOAD PURCHASE ORDER ----------
                        const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
                        const soId = po.getValue('createdfrom'); // ← this links back to the Sales Order

                        if (!soId) {
                            log.audit('PO not linked to SO', `PO ${poId} has no Sales Order link.`);
                            return;
                        }

                        // ---------- LOAD SALES ORDER ----------
                        const so = record.load({ type: record.Type.SALES_ORDER, id: soId });
                        const soNum = so.getValue('tranid');
                        const soEmployeeId = so.getValue('employee');

                        if (!soEmployeeId) {
                            log.audit('No Employee on SO', `SO ${soNum} has no employee assigned`);
                            return;
                        }

                        // ---------- LOAD EMPLOYEE (CREATOR) ----------
                        let recipientEmail = null;
                        try {
                            const empRec = record.load({ type: record.Type.EMPLOYEE, id: soEmployeeId });
                            recipientEmail = empRec.getValue('email');
                            if (!recipientEmail) {
                                log.audit('No Email Found', `Employee ID ${soEmployeeId} has no email`);
                                return;
                            }
                            log.debug('Employee Email Found', `${recipientEmail} (Employee ID: ${soEmployeeId})`);
                        } catch (empErr) {
                            log.error('Employee Load Failed', empErr);
                            return;
                        }

                        // ---------- BUILD EMAIL ----------
                        let body = `<p>Hello,</p>
                            <p>The following items have been received in the warehouse for Sales Order <strong>${soNum}</strong>:</p>
                            <ul>`;
                        newReceivedLines.forEach(line => {
                            body += `<li>${line.itemName} — Quantity Received: ${line.qtyReceived}</li>`;
                        });
                        body += `</ul>
                            <p><a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/salesord.nl?id=${soId}">
                            View Sales Order</a></p>`;

                        // ---------- SEND EMAIL ----------
                        log.audit('Sending Email', `IR ${irId} → SO ${soNum} → Recipient: ${recipientEmail}`);
                        email.send({
                            author: soEmployeeId, // internal ID of employee
                            recipients: recipientEmail,
                            subject: `Item(s) Received for Sales Order ${soNum}`,
                            body: body
                        });

                        // ---------- MARK LINES AS NOTIFIED ----------
                        newReceivedLines.forEach(line => {
                            ir.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ir_notif_sent',
                                line: line.line,
                                value: true
                            });
                        });

                        ir.save();
                        log.debug('IR Processed', `IR ${irId} processed successfully. Lines notified: ${newReceivedLines.length}`);

                    } catch (err) {
                        log.error('IR Processing Error', err);
                    }
                });

            } catch (e) {
                log.error('Scheduled Script Error', e);
            }
        };

        return { execute };
    });
