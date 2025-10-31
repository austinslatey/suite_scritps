/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'],
    (record, search, email, runtime, log) => {

        const execute = (context) => {
            try {
                log.debug('Scheduled Script Start', `Triggered at ${new Date().toISOString()}`);

                // ---------- CONFIG ----------
                const startDate = '10/01/2025'; // change as needed, MM/DD/YYYY
                const maxResults = 100;         // max IRs to process per run

                // ---------- SEARCH ---------- 
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

                // ---------- PROCESS EACH IR ----------
                results.forEach(result => {
                    try {
                        const irId = result.getValue('internalid');
                        const poId = result.getValue('createdfrom');

                        log.debug('Processing IR Start', `IR ID: ${irId}, PO: ${poId}`);

                        if (!poId) return; // skip IRs not linked to a PO

                        // Load IR dynamically
                        const ir = record.load({ type: record.Type.ITEM_RECEIPT, id: irId, isDynamic: false });
                        const lineCount = ir.getLineCount({ sublistId: 'item' });
                        const newReceivedLines = [];

                        // ---------- LOOP LINES ----------
                        for (let i = 0; i < lineCount; i++) {
                            const qtyReceived = ir.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                            const notifSent = ir.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ir_notif_sent', line: i });

                            if (qtyReceived > 0 && !notifSent) {
                                const itemName = ir.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                                newReceivedLines.push({ line: i, itemName, qtyReceived });
                            }
                        }

                        if (newReceivedLines.length === 0) return; // nothing new to notify

                        // ---------- LOAD PO ----------
                        const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
                        const poNum = po.getValue('tranid');
                        const employeeId = po.getValue('employee');

                        // ---------- FIND EMPLOYEE EMAIL ----------
                        let recipientEmail = null;

                        if (employeeId) {
                            try {
                                const empRec = record.load({ type: record.Type.EMPLOYEE, id: employeeId });
                                recipientEmail = empRec.getValue('email');
                                log.debug('Employee Email Found', `${recipientEmail} (Employee ID: ${employeeId})`);
                            } catch (empErr) {
                                log.error('Employee Load Failed', empErr);
                            }
                        }

                        if (!recipientEmail) {
                            log.audit('No Recipients Found', `IR ${irId} → PO ${poNum} (No employee email found)`);
                            return;
                        }

                        // ---------- BUILD EMAIL ----------
                        let body = `<p>Hello,</p><p>The following items have been received for PO <strong>${poNum}</strong>:</p><ul>`;
                        newReceivedLines.forEach(line => {
                            body += `<li>${line.itemName} — Quantity Received: ${line.qtyReceived}</li>`;
                        });
                        body += `</ul><p><a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View PO</a></p>`;

                        // ---------- DEBUG / SEND EMAIL ----------
                        log.audit('Would send email', `IR ${irId} → PO ${poNum} → Recipient: ${recipientEmail}`);

                        // Uncomment below to actually send
                        email.send({
                            author: runtime.getCurrentUser().id,
                            recipients: recipientEmail,
                            subject: `Item(s) Received for Purchase Order ${poNum}`,
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

                    } catch (irError) {
                        log.error(`IR Processing Error ${result.getValue('internalid')}`, irError);
                    }
                });

            } catch (e) {
                log.error('Scheduled Script Error', e);
            }
        };

        return { execute };
    });
