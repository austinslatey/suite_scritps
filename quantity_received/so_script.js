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
                const startDate = '10/01/2025'; // MM/DD/YYYY
                const maxResults = 100;         // max IRs per run

                // ---------- SEARCH ITEM RECEIPTS ----------
                const irSearch = search.create({
                    type: search.Type.ITEM_RECEIPT,
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
                        if (!poId) return;

                        // Load IR
                        const ir = record.load({ type: record.Type.ITEM_RECEIPT, id: irId, isDynamic: false });
                        const lineCount = ir.getLineCount({ sublistId: 'item' });
                        const newReceivedLines = [];

                        // ---------- LOOP IR LINES ----------
                        for (let i = 0; i < lineCount; i++) {
                            const qtyReceived = ir.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                            const notifSent = ir.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ir_notif_sent', line: i });

                            if (qtyReceived > 0 && !notifSent) {
                                const itemName = ir.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                                newReceivedLines.push({ line: i, itemName, qtyReceived });
                            }
                        }

                        if (newReceivedLines.length === 0) return;

                        // ---------- LOAD PO ----------
                        const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId });
                        const poNum = po.getValue('tranid');

                        // ---------- GET SO FROM PO ----------
                        const soId = po.getValue('createdfrom');
                        log.debug('PO createdfrom value', `PO: ${poNum}, SO ID: ${soId}`);

                        if (!soId) {
                            log.audit('No SO Linked', `PO ${poNum} has no linked Sales Order`);
                            return;
                        }

                        // ---------- USE LOOKUP INSTEAD OF LOADING SO ----------
                        let soData;
                        try {
                            soData = search.lookupFields({
                                type: search.Type.SALES_ORDER,
                                id: soId,
                                columns: ['recordtype', 'tranid', 'salesrep']
                            });
                            log.debug('SO Lookup Result', JSON.stringify(soData));
                        } catch (lookupError) {
                            log.error('SO Lookup Failed', `soId: ${soId}, Error: ${lookupError.message}`);
                            return;
                        }

                        // Check if it's actually a Sales Order
                        if (soData.recordtype !== 'salesorder') {
                            log.audit('Not a Sales Order', `PO ${poNum} was created from: ${soData.recordtype} (ID: ${soId})`);
                            return;
                        }

                        const soNum = soData.tranid;

                        // ---------- GET SALES REP (EMPLOYEE) ID ----------
                        let employeeId = null;
                        if (soData.salesrep && soData.salesrep.length > 0) {
                            employeeId = soData.salesrep[0].value;
                        }

                        if (!employeeId) {
                            log.audit('No Sales Rep Found', `SO ${soNum} has no sales rep assigned`);
                            return;
                        }

                        log.debug('Sales Rep ID Found', `Employee ID: ${employeeId}`);

                        // ---------- GET EMPLOYEE EMAIL ----------
                        let recipientEmail = null;
                        try {
                            const empData = search.lookupFields({
                                type: search.Type.EMPLOYEE,
                                id: employeeId,
                                columns: ['email']
                            });
                            recipientEmail = empData.email;

                            if (!recipientEmail) {
                                log.audit('No Email Found', `Employee ID ${employeeId} has no email`);
                                return;
                            }
                            log.debug('Employee Email Found', `${recipientEmail} (Employee ID: ${employeeId})`);
                        } catch (empErr) {
                            log.error('Employee Lookup Failed', empErr.message);
                            return;
                        }

                        // ---------- BUILD EMAIL ----------
                        let body = `<p>Hello,</p><p>The following items have been received for Sales Order <strong>${soNum}</strong> (linked to PO ${poNum}):</p><ul>`;
                        newReceivedLines.forEach(line => {
                            body += `<li>${line.itemName} — Quantity Received: ${line.qtyReceived}</li>`;
                        });
                        body += `</ul><p><a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/salesord.nl?id=${soId}">View Sales Order</a> | <a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View Purchase Order</a></p>`;

                        // ---------- SEND EMAIL ----------
                        log.audit('Sending Email', `IR ${irId} → PO ${poNum} → SO ${soNum} → Recipient: ${recipientEmail}`);
                        email.send({
                            author: employeeId,
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

                    } catch (irError) {
                        log.error(`IR Processing Error ${result.getValue('internalid')}`, irError.message || irError);
                    }
                });

            } catch (e) {
                log.error('Scheduled Script Error', e.message || e);
            }
        };

        return { execute };
    });