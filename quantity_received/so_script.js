/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'],
    (record, search, email, runtime, log) => {

        const execute = (context) => {
            try {
                log.audit('Scheduled Script Start', `Triggered at ${new Date().toISOString()}`);

                // ---------- CONFIG ----------
                // Only process Item Receipts created on or after this date (MM/DD/YYYY format)
                const startDate = '11/4/2025';

                // Maximum number of Item Receipts to process per execution
                const maxResults = 100;

                // ---------- SEARCH ITEM RECEIPTS ----------
                const irSearch = search.create({
                    type: search.Type.ITEM_RECEIPT,
                    filters: [['trandate', 'onorafter', startDate]],
                    columns: ['internalid', 'createdfrom']
                });

                const results = irSearch.run().getRange({ start: 0, end: maxResults });
                if (!results || results.length === 0) {
                    log.audit('No Items to Process', 'No Item Receipts found for processing.');
                    return;
                }

                log.audit('Processing Start', `Found ${results.length} Item Receipt(s) to process`);

                // ---------- PROCESS EACH IR ----------
                results.forEach(result => {
                    try {
                        const irId = result.getValue('internalid');
                        const poId = result.getValue('createdfrom');

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

                        if (!soId) {
                            log.audit('Skipped - No SO Linked', `PO ${poNum} has no linked Sales Order`);
                            return;
                        }

                        // ---------- USE LOOKUP TO GET SO DATA INCLUDING CREATOR ----------
                        let soData;
                        try {
                            soData = search.lookupFields({
                                type: search.Type.SALES_ORDER,
                                id: soId,
                                columns: ['recordtype', 'tranid', 'salesrep', 'createdby']
                            });
                        } catch (lookupError) {
                            log.error('SO Lookup Failed', `soId: ${soId}, Error: ${lookupError.message}`);
                            return;
                        }

                        // Check if it's actually a Sales Order
                        if (soData.recordtype !== 'salesorder') {
                            log.audit('Skipped - Not a Sales Order', `PO ${poNum} was created from: ${soData.recordtype}`);
                            return;
                        }

                        const soNum = soData.tranid;

                        // ---------- GET SALES REP ID ----------
                        let salesRepId = null;
                        if (soData.salesrep && soData.salesrep.length > 0) {
                            salesRepId = soData.salesrep[0].value;
                        }

                        // ---------- GET CREATOR ID ----------
                        let creatorId = null;
                        if (soData.createdby && soData.createdby.length > 0) {
                            creatorId = soData.createdby[0].value;
                        }

                        // ---------- COLLECT UNIQUE RECIPIENTS ----------
                        const recipientIds = new Set();
                        if (salesRepId) recipientIds.add(salesRepId);
                        if (creatorId) recipientIds.add(creatorId);

                        if (recipientIds.size === 0) {
                            log.audit('Skipped - No Recipients', `SO ${soNum} has no sales rep or creator to notify`);
                            return;
                        }

                        // ---------- GET EMAIL ADDRESSES FOR ALL RECIPIENTS ----------
                        const recipientEmails = [];
                        for (const empId of recipientIds) {
                            try {
                                const empData = search.lookupFields({
                                    type: search.Type.EMPLOYEE,
                                    id: empId,
                                    columns: ['email', 'entityid']
                                });

                                if (empData.email) {
                                    recipientEmails.push(empData.email);
                                } else {
                                    log.audit('Skipped - No Email', `Employee ID ${empId} has no email address`);
                                }
                            } catch (empErr) {
                                log.error('Employee Lookup Failed', `Employee ID ${empId}: ${empErr.message}`);
                            }
                        }

                        if (recipientEmails.length === 0) {
                            log.audit('Skipped - No Email Addresses', `No valid email addresses for SO ${soNum} recipients`);
                            return;
                        }

                        // ---------- BUILD EMAIL ----------
                        let body = `<p>Hello,</p><p>The following items have been received for Sales Order <strong>${soNum}</strong> (linked to PO ${poNum}):</p><ul>`;
                        newReceivedLines.forEach(line => {
                            body += `<li>${line.itemName} — Quantity Received: ${line.qtyReceived}</li>`;
                        });
                        body += `</ul><p><a href="https://3461249.app.netsuite.com/app/accounting/transactions/salesord.nl?id=${soId}">View Sales Order</a> | <a href="https://3461249-sb1.app.netsuite.com/app/accounting/transactions/purchord.nl?id=${poId}">View Purchase Order</a></p>`;

                        // ---------- SEND EMAIL ----------
                        const authorId = Array.from(recipientIds)[0];
                        const recipientList = recipientEmails.join(', ');

                        log.audit('Email Sent', `IR ${irId} | PO ${poNum} | SO ${soNum} | To: ${recipientList}`);
                        email.send({
                            author: authorId,
                            recipients: recipientEmails,
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

                    } catch (irError) {
                        log.error(`IR Processing Error ${result.getValue('internalid')}`, irError.message || irError);
                    }
                });

                log.audit('Scheduled Script Complete', `Processed ${results.length} Item Receipt(s)`);

            } catch (e) {
                log.error('Scheduled Script Error', e.message || e);
            }
        };

        return { execute };
    });