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

    let billTypeStr = "Invoice";
    if (data.billType === 'CASH_BILL' || data.billType === 'CASH') billTypeStr = 'Cash Bill';
    else if (data.billType === 'CREDIT_BILL' || data.billType === 'CREDIT') billTypeStr = 'Credit Bill';
    else if (data.billType === 'PAYMENT_RECEIVED' || data.billType === 'DEBIT') billTypeStr = 'Payment Receipt';

    const netAmt = data.netAmount || data.billAmount || 0;
    const paidAmt = data.paymentAmount || 0; // for payments
    const displayPaid = data.billType === 'PAYMENT_RECEIVED' ? paidAmt : (netAmt - (data.creditAmount || 0));

    let msg = `Hello ${data.customerName},\n\n`;
    msg += `Thank you for your business. Here is your ${billTypeStr} summary:\n\n`;
    msg += `🧾 *Bill No:* INV-${data.id}\n`;
    msg += `📅 *Date:* ${data.entryDate || data.billDate || new Date().toISOString().split('T')[0]}\n`;
    msg += `💰 *Bill Amount:* ${appSettings.currencySymbol}${formatCurrency(netAmt)}\n`;
    
    if (displayPaid > 0) {
        msg += `✅ *Paid Amount:* ${appSettings.currencySymbol}${formatCurrency(displayPaid)}\n`;
    }
    
    if (data.creditAmount > 0) {
        msg += `⚠️ *Credit Pending:* ${appSettings.currencySymbol}${formatCurrency(data.creditAmount)}\n`;
    }

    msg += `\nFor any queries, please contact us.\n\nRegards,\n${appSettings.companyName || 'Anmol Fabrics'}`;

    try {
        // Populate Invoice HTML silently
        populateInvoiceForPdf(data);
        
        const printArea = document.getElementById('invoicePrintArea');
        // Generate PDF base64 using html2pdf
        const opt = {
            margin: 0.2,
            filename: `INV-${data.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        document.body.classList.add('printing-invoice');
        let pdfBase64;
        try {
            pdfBase64 = await html2pdf().set(opt).from(printArea).output('datauristring');
        } finally {
            document.body.classList.remove('printing-invoice');
        }

        const res = await fetch('/api/whatsapp/send-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phone: phone, 
                fileBase64: pdfBase64,
                filename: `INV-${data.id}.pdf`,
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
