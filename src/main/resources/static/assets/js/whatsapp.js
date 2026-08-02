// whatsapp.js

document.addEventListener('DOMContentLoaded', () => {
    // Check WhatsApp status on load
    checkWaStatus();

    // Listeners for Sidebar
    const sidebarWhatsappBtn = document.getElementById('sidebarWhatsappBtn');
    if (sidebarWhatsappBtn) {
        sidebarWhatsappBtn.addEventListener('click', (e) => {
            e.preventDefault();
            checkWaStatus();
            const waModal = new bootstrap.Modal(document.getElementById('whatsappModal'));
            waModal.show();
        });
    }

    // Listeners for Modal Buttons
    const btnWaRefreshQr = document.getElementById('btnWaRefreshQr');
    if (btnWaRefreshQr) {
        btnWaRefreshQr.addEventListener('click', () => {
            connectWa();
        });
    }

    const btnWaLogout = document.getElementById('btnWaLogout');
    if (btnWaLogout) {
        btnWaLogout.addEventListener('click', () => {
            if (confirm("Are you sure you want to disconnect WhatsApp?")) {
                disconnectWa();
            }
        });
    }

    // Listeners for Save & Send Button in Billing Modal
    const btnSaveSendWa = document.getElementById('btnSaveSendWa');
    if (btnSaveSendWa) {
        btnSaveSendWa.addEventListener('click', (e) => {
            e.preventDefault();
            window.sendWaAfterSave = true;
            document.getElementById('btnSaveBill').click();
        });
    }

    // Alt+W Global Shortcut
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'w' || e.key === 'W')) {
            e.preventDefault();
            if (document.getElementById('billingModal').classList.contains('show')) {
                const btn = document.getElementById('btnSaveSendWa');
                if (btn && !btn.disabled) {
                    btn.click();
                }
            }
        }
    });

    // Listener removed because buttons have explicit onclick="sendBillToWa(...)"
});

async function checkWaStatus() {
    try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        const badge = document.getElementById('waStatusBadge');
        
        if (data && data.status === 'CONNECTED') {
            if (badge) {
                badge.textContent = 'Connected';
                badge.className = 'badge bg-success ms-1';
            }
            showWaConnected();
        } else {
            if (badge) {
                badge.textContent = 'Not Connected';
                badge.className = 'badge bg-danger ms-1';
            }
            showWaDisconnected();
        }
    } catch (e) {
        console.error("WA Status Error:", e);
        const badge = document.getElementById('waStatusBadge');
        if (badge) {
            badge.textContent = 'Error';
            badge.className = 'badge bg-secondary ms-1';
        }
    }
}

function showWaConnected() {
    document.getElementById('waLoading')?.classList.add('d-none');
    document.getElementById('waDisconnected')?.classList.add('d-none');
    document.getElementById('waConnected')?.classList.remove('d-none');
}

function showWaDisconnected() {
    document.getElementById('waLoading')?.classList.add('d-none');
    document.getElementById('waConnected')?.classList.add('d-none');
    document.getElementById('waDisconnected')?.classList.remove('d-none');
    connectWa(); // Try to fetch QR
}

async function connectWa() {
    try {
        const qrImg = document.getElementById('waQrImage');
        const spinner = document.getElementById('waQrSpinner');
        
        if (qrImg) qrImg.style.display = 'none';
        if (spinner) spinner.style.display = 'inline-block';

        const res = await fetch('/api/whatsapp/start', { method: 'POST' });
        const data = await res.json();
        
        if (data) {
            if (data.status === 'connected') {
                showWaConnected();
                const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
                if (modal) modal.hide();
                return;
            } else if (data.status === 'waiting_for_qr') {
                // Poll again in 2 seconds
                setTimeout(connectWa, 2000);
                return;
            } else if (data.qrUrl) {
                if (qrImg) {
                    qrImg.src = data.qrUrl; // QR URL or Base64
                    qrImg.onload = () => {
                        spinner.style.display = 'none';
                        qrImg.style.display = 'inline-block';
                    };
                }
                
        // Poll for connection status while QR is shown
                pollForConnection();
            }
        }
    } catch (e) {
        console.error("WA Connect Error:", e);
    }
}

let connectionPollInterval;

function pollForConnection() {
    if (connectionPollInterval) clearInterval(connectionPollInterval);
    
    connectionPollInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/whatsapp/status');
            const data = await res.json();
            
            if (data.status === 'connected') {
                clearInterval(connectionPollInterval);
                showWaConnected();
                const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
                if (modal) modal.hide();
                showNotification("WhatsApp connected successfully!");
            }
        } catch (e) {
            console.error("Poll Error:", e);
        }
    }, 3000); // Check every 3 seconds
}

async function disconnectWa() {
    try {
        if (connectionPollInterval) clearInterval(connectionPollInterval);
        const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
        showNotification("WhatsApp disconnected");
        checkWaStatus();
    } catch (e) {
        console.error("WA Disconnect Error:", e);
    }
}

window.sendBillToWa = async function(id, type = 'sales') {
    try {
        // Show loading notification
        showNotification("Preparing WhatsApp message...", "info");

        let res;
        if (type === 'billing') {
            res = await fetch(`/api/billing/${id}`);
        } else {
            res = await fetch(`/api/sales/${id}`);
        }

        if (!res.ok) {
            throw new Error(`Could not fetch ${type} record details`);
        }
        
        const data = await res.json();
        
        // System verification prompt as requested by user
        const customerName = data.customerName || data.tempCustomerName || 'Unknown Customer';
        const customerContact = data.contactNumber || 'Unknown Number';
        const isConfirmed = confirm(`SYSTEM VERIFICATION:\n\nPlease confirm if you want to send the Bill PDF to this customer on WhatsApp:\n\nName: ${customerName}\nContact: ${customerContact}\n\nClick OK to send, or Cancel to abort.`);
        
        if (!isConfirmed) {
            showNotification("WhatsApp sending cancelled by user.", "warning");
            return;
        }

        await processSendWa(data);

    } catch (e) {
        console.error("WA Send Error:", e);
        showNotification("Failed to send WhatsApp message", "danger");
    }
}

async function processSendWa(data) {
    if (!data.contactNumber || data.contactNumber.trim() === '') {
        showNotification("Customer contact number is missing!", "danger");
        return;
    }

    let phone = data.contactNumber;
    // ensure +91 or country code if needed. Assuming India +91 if length is 10
    if (phone.length === 10) {
        phone = "91" + phone;
    }

    let isPayment = (data.billType === 'PAYMENT_RECEIVED' || (data.netAmount === 0 && data.creditAmount < 0));
    let isReturn = (data.billType === 'PRODUCT_RETURN' || data.billType === 'CASH_RETURN' || data.netAmount < 0);
    let isCashReturn = (data.billType === 'CASH_RETURN');
    let isCustomerCredit = isPayment || (isReturn && !isCashReturn);
    let amountLabel = isCustomerCredit ? "Credit" : (isCashReturn ? "Refund" : "Debit");
    
    let typeLabel = "Invoice";
    if (isPayment) typeLabel = "Payment Receipt";
    else if (isCashReturn) typeLabel = "Cash Refund";
    else if (isReturn) typeLabel = "Product Return";
    else if (data.billType === 'CASH_BILL' || data.billType === 'CASH') typeLabel = 'Cash Bill';
    else if (data.billType === 'CREDIT_BILL' || data.billType === 'CREDIT') typeLabel = 'Credit Bill';

    let currentCredit = 0;
    if (isPayment || isReturn) {
        try {
            const queryParams = new URLSearchParams({ customerName: data.customerName, contact: data.contactNumber || '' });
            if (data.id) queryParams.append('upToId', data.id);
            const crRes = await fetch(`/api/sales/customer/credit?${queryParams.toString()}`);
            if(crRes.ok) {
                currentCredit = parseFloat(await crRes.text()) || 0;
            }
        } catch(e) {}
    }

    let netAmt = data.netAmount || data.billAmount || 0;
    let txnAmount = isPayment ? Math.abs(data.creditAmount) : Math.abs(netAmt);
    let previousCredit = isCustomerCredit ? (currentCredit + txnAmount) : (isCashReturn ? currentCredit : (currentCredit - txnAmount));

    let msg = `Hello ${data.customerName},\n\n`;
    msg += `Thank you for your business. Here is your ${typeLabel} summary:\n\n`;
    
    if (isPayment || isReturn) {
        msg += `🧾 *Receipt No:* ${(isReturn ? 'RET-' : 'REC-')}${data.id}\n`;
        msg += `📅 *Date:* ${data.entryDate || data.billDate || new Date().toISOString().split('T')[0]}\n`;
        
        if (isCashReturn) {
            msg += `✅ *${amountLabel}:* ${appSettings.currencySymbol}${formatCurrency(txnAmount)}\n`;
        } else {
            msg += `💰 *Balance:* ${formatCurrency(previousCredit)} DR\n`;
            msg += `✅ *${amountLabel}:* ${formatCurrency(txnAmount)}\n`;
            msg += `📊 *Closing Balance:* ${formatCurrency(currentCredit)} DR\n`;
        }
    } else {
        const displayPaid = data.billType === 'PAYMENT_RECEIVED' ? txnAmount : (netAmt - (data.creditAmount || 0));
        msg += `🧾 *Bill No:* INV-${data.id}\n`;
        msg += `📅 *Date:* ${data.entryDate || data.billDate || new Date().toISOString().split('T')[0]}\n`;
        msg += `💰 *Bill Amount:* ${appSettings.currencySymbol}${formatCurrency(netAmt)}\n`;
        if (displayPaid > 0) {
            msg += `✅ *Paid Amount:* ${appSettings.currencySymbol}${formatCurrency(displayPaid)}\n`;
        }
        if (data.creditAmount > 0) {
            msg += `⚠️ *Credit Pending:* ${appSettings.currencySymbol}${formatCurrency(data.creditAmount)}\n`;
        }
    }

    msg += `\nFor any queries, please contact us.\n\nRegards,\n${appSettings.companyName || 'Anmol Fabrics'}`;

    try {
        let pdfBase64;
        const opt = {
            margin: 10,
            filename: `${(isPayment || isReturn) ? 'REC' : 'INV'}-${data.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (isPayment || isReturn) {
            // Generate Receipt HTML exactly as in app.js printReceipt
            let calculationString = isCashReturn 
                ? `${amountLabel}: ${formatCurrency(txnAmount)}`
                : `Balance: ${formatCurrency(previousCredit)} DR &nbsp;&nbsp;&nbsp; ${amountLabel}: ${formatCurrency(txnAmount)} &nbsp;&nbsp;&nbsp; Closing Balance: ${formatCurrency(currentCredit)} DR`;

            let city = "-";
            if (data.customer && data.customer.city) city = data.customer.city;
            else if (data.city) city = data.city;

            let htmlContent = `
            <div id="tempWaReceiptPrintArea" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; color: black; padding: 20px; width: 800px; margin: 0 auto; box-sizing: border-box;">
                <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center;">
                    <h2>${appSettings.companyName || 'My Company'}</h2>
                    <h3>${typeLabel.toUpperCase()}</h3>
                    <p><strong>Receipt No:</strong> ${(isReturn ? 'RET-' : 'REC-') + data.id} &nbsp;&nbsp; <strong>Date:</strong> ${new Date(data.entryDate || data.billDate || new Date().toISOString().split('T')[0]).toLocaleDateString()}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #000; text-align: left; background-color: #f0f0f0;">CUSTOMER NAME</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: left; background-color: #f0f0f0;">CONTACT NUMBER</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: left; background-color: #f0f0f0;">CITY</th>
                        <th style="padding: 10px; border: 1px solid #000; text-align: left; background-color: #f0f0f0;">REMARKS</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #000; text-align: left;">${data.customerName}</td>
                        <td style="padding: 10px; border: 1px solid #000; text-align: left;">${data.contactNumber || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #000; text-align: left;">${city}</td>
                        <td style="padding: 10px; border: 1px solid #000; text-align: left;">${data.remarks || '-'}</td>
                    </tr>
                </table>
                
                <div style="font-weight: bold; font-size: 14px; margin-top: 15px; text-align: right; border: 1px solid #000; padding: 10px; background-color: #f9f9f9;">
                    ${calculationString}
                </div>
                
                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div><br>_________________________<br>Customer Signature</div>
                    <div style="text-align: right;"><br>_________________________<br>Authorized Signatory</div>
                </div>
            </div>`;
            
            let tempFrame = document.createElement('iframe');
            tempFrame.style.position = 'absolute';
            tempFrame.style.top = '-9999px';
            tempFrame.style.left = '-9999px';
            tempFrame.style.width = '840px';
            tempFrame.style.height = '1200px';
            document.body.appendChild(tempFrame);

            const doc = tempFrame.contentWindow.document;
            doc.open();
            doc.write('<html><head><title>Receipt</title></head><body style="margin:0; padding:0; background:white;">' + htmlContent + '</body></html>');
            doc.close();

            try {
                const targetEl = doc.getElementById('tempWaReceiptPrintArea');
                pdfBase64 = await html2pdf().set(opt).from(targetEl).output('datauristring');
            } finally {
                document.body.removeChild(tempFrame);
            }
        } else {
            populateInvoiceForPdf(data);
            const printArea = document.getElementById('invoicePrintArea');
            
            let tempFrame = document.createElement('iframe');
            tempFrame.style.position = 'absolute';
            tempFrame.style.top = '-9999px';
            tempFrame.style.left = '-9999px';
            tempFrame.style.width = '840px';
            tempFrame.style.height = '1200px';
            document.body.appendChild(tempFrame);

            const doc = tempFrame.contentWindow.document;
            doc.open();
            doc.write('<html><head><title>Invoice</title>');
            doc.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">');
            doc.write('<link href="/assets/css/style.css" rel="stylesheet">');
            doc.write('<style>body { background: white !important; color: black !important; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }</style>');
            doc.write('</head><body style="padding: 20px; margin: 0; background: white;">');
            doc.write('<div id="pdfInvoiceContainer" style="max-width: 800px; margin: 0 auto;">');
            doc.write(printArea.innerHTML);
            doc.write('</div></body></html>');
            doc.close();

            await new Promise(resolve => setTimeout(resolve, 300));

            try {
                const targetEl = doc.getElementById('pdfInvoiceContainer');
                pdfBase64 = await html2pdf().set(opt).from(targetEl).output('datauristring');
            } finally {
                document.body.removeChild(tempFrame);
            }
        }

        const res = await fetch('/api/whatsapp/send-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone: phone, 
                fileBase64: pdfBase64,
                filename: `${(isPayment || isReturn) ? 'REC' : 'INV'}-${data.id}.pdf`,
                caption: msg 
            })
        });
        const result = await res.json();
        
        if (result && result.status !== 'error') {
            showNotification("WhatsApp invoice PDF sent successfully!", "success");
        } else {
            showNotification(`Failed to send WA: ${result.message || 'Unknown error'}`, "danger");
        }
    } catch (e) {
        console.error(e);
        showNotification("Failed to send WhatsApp message with PDF", "danger");
    }
}

function populateInvoiceForPdf(bill) {
    const itemsDetails = bill.items || [];
    const prefix = "INV-";
    
    document.getElementById('invBusinessName').innerText = appSettings.companyName || "My Company";
    document.getElementById('invCustomerName').innerText = bill.customerName;
    document.getElementById('invCustomerContact').innerText = bill.contactNumber;
    document.getElementById('invCustomerCity').innerText = bill.city || '';
    
    document.getElementById('invDate').innerText = new Date(bill.billDate || bill.entryDate).toLocaleDateString();
    document.getElementById('invNumber').innerText = prefix + bill.id;
    
    document.getElementById('invTerms').innerText = appSettings.printTermsConditions || '';
    document.getElementById('invBankDetails').innerText = appSettings.printBankDetails || '';
    document.getElementById('invSignatory').innerText = appSettings.printSignatory || 'Authorized Signatory';
    
    const printArea = document.getElementById('invoicePrintArea');
    printArea.style.maxWidth = '800px';
    printArea.style.fontSize = '1rem';
    
    let salesmanName = '-';
    if (bill.salesman) salesmanName = bill.salesman.name;
    
    document.getElementById('invSalesman').innerText = salesmanName;

    const tbody = document.getElementById('invItemsTable');
    tbody.innerHTML = '';
    
    if (itemsDetails.length === 0) {
        // If it's a generic payment receipt
        let desc = "Payment Receipt";
        if (bill.billType === 'CASH_RETURN' || bill.billType === 'PRODUCT_RETURN') desc = "Refund";
        
        tbody.innerHTML += `<tr>
            <td class="text-start">1</td>
            <td class="text-start fw-medium">${desc}</td>
            <td class="text-center">-</td>
            <td class="text-end">-</td>
            <td class="text-end fw-bold">${appSettings.currencySymbol}${formatCurrency(bill.netAmount || bill.paymentAmount || 0)}</td>
        </tr>`;
    } else {
        itemsDetails.forEach((item, index) => {
            let name = item.itemName || (item.product ? item.product.itemName : 'Product');
            tbody.innerHTML += `<tr>
                <td class="text-start">${index + 1}</td>
                <td class="text-start fw-medium">${name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${appSettings.currencySymbol}${formatCurrency(item.unitPrice)}</td>
                <td class="text-end fw-bold">${appSettings.currencySymbol}${formatCurrency(item.totalPrice)}</td>
            </tr>`;
        });
    }

    const netAmt = bill.netAmount || bill.billAmount || 0;
    document.getElementById('invSubtotal').innerText = appSettings.currencySymbol + formatCurrency(netAmt);
    
    let totalDiscount = 0;
    if (bill.discount) {
        let totalQty = 1;
        if (itemsDetails.length > 0) {
            totalQty = 0;
            itemsDetails.forEach(item => totalQty += item.quantity);
        }
        totalDiscount = bill.discount * totalQty;
    }
    
    document.getElementById('invDiscount').innerText = appSettings.currencySymbol + formatCurrency(totalDiscount);
    
    if (bill.expenses && bill.expenses > 0) {
        document.getElementById('invExpensesRow').classList.remove('d-none');
        document.getElementById('invExpenses').innerText = appSettings.currencySymbol + formatCurrency(bill.expenses);
    } else {
        document.getElementById('invExpensesRow').classList.add('d-none');
    }
    
    document.getElementById('invNetTotal').innerText = appSettings.currencySymbol + formatCurrency(netAmt);
    document.getElementById('invPaid').innerText = appSettings.currencySymbol + formatCurrency(bill.paidAmount || bill.paymentAmount || 0);
    document.getElementById('invCredit').innerText = appSettings.currencySymbol + formatCurrency(bill.creditAmount || 0);
}
