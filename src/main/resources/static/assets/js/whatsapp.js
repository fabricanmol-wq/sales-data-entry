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
        btnWaRefreshQr.addEventListener('click', async () => {
            const originalText = btnWaRefreshQr.innerHTML;
            btnWaRefreshQr.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Refreshing...';
            btnWaRefreshQr.disabled = true;
            try {
                // Force logout the old stuck session first to get a completely new QR
                if (typeof connectionPollInterval !== 'undefined' && connectionPollInterval) clearInterval(connectionPollInterval);
                await fetch('/api/whatsapp/logout', { method: 'POST' });
                // Wait briefly for the server to process the stop
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error("Logout before refresh failed:", e);
            }
            btnWaRefreshQr.innerHTML = originalText;
            btnWaRefreshQr.disabled = false;
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
            btnSaveSendWa.disabled = true;
            const originalText = btnSaveSendWa.innerText;
            btnSaveSendWa.innerText = 'Processing...';
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
            if (data.status && data.status.toUpperCase() === 'CONNECTED') {
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
            
            if (data.status && data.status.toUpperCase() === 'CONNECTED') {
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
        if (typeof connectionPollInterval !== 'undefined' && connectionPollInterval) clearInterval(connectionPollInterval);
        
        // Optimistically update UI
        showWaDisconnected();
        const badge = document.getElementById('waStatusBadge');
        if (badge) {
            badge.textContent = 'Not Connected';
            badge.className = 'badge bg-danger ms-1';
        }
        
        const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
        showNotification("WhatsApp disconnected");
        
        setTimeout(checkWaStatus, 1500); // verify after delay
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
        
        let data = await res.json();
        
        // If this is a SalesRecord from the ledger that represents an Invoice, fetch the full Billing record so items are present!
        if (type === 'sales' && data.remarks && data.remarks.includes('Invoice #')) {
            const billId = data.remarks.replace('Invoice #', '').trim();
            const billRes = await fetch(`/api/billing/${billId}`);
            if (billRes.ok) {
                data = await billRes.json();
            }
        } else if (type === 'sales' && (data.billType === 'CASH_BILL' || data.billType === 'CREDIT_BILL') && !data.items) {
            const billRes = await fetch(`/api/billing/${id}`);
            if (billRes.ok) {
                data = await billRes.json();
            }
        }
        
        // System verification prompt as requested by user
        const customerName = data.customerName || data.tempCustomerName || 'Unknown Customer';
        const customerContact = data.contactNumber || 'Unknown Number';
        const isConfirmed = confirm(`SYSTEM VERIFICATION:\n\nPlease confirm if you want to send the Bill PDF to this customer on WhatsApp:\n\nName: ${customerName}\nContact: ${customerContact}\n\nClick OK to send, or Cancel to abort.`);
        
        if (!isConfirmed) {
            showNotification("WhatsApp sending cancelled by user.", "warning");
            return;
        }

        showNotification(`🚀 Sending WhatsApp PDF to ${customerName}...`, "info");
        
        // Process sending asynchronously in background so confirmation modal closes immediately
        processSendWa(data).catch(err => {
            console.error("WA Send Error:", err);
            showNotification(`Failed to send WA: ${err.message || 'Unknown error'}`, "danger");
        });

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

    let phone = data.contactNumber.replace(/[^0-9]/g, '');
    if (phone.length === 10) {
        phone = "91" + phone;
    }

    let msg = `Hello *${data.customerName || 'Customer'}*,\n\n`;
    msg += `Please find attached your details from *${appSettings.companyName || 'Anmol Fabrics'}*:\n\n`;

    const isPayment = (data.billType === 'PAYMENT_RECEIVED' || (data.netAmount === 0 && data.creditAmount < 0));
    const isReturn = (data.billType === 'PRODUCT_RETURN' || data.billType === 'CASH_RETURN');
    const isCashReturn = (data.billType === 'CASH_RETURN');

    // Calculate amounts properly based on bill type
    const totalAmt = data.totalAmount || data.amount || 0;
    const netAmt = data.netAmount !== undefined ? data.netAmount : (data.billAmount || totalAmt);
    let txnAmount = data.paidAmount !== undefined ? data.paidAmount : (data.amount || 0);

    if (isPayment || isReturn) {
        txnAmount = isPayment ? Math.abs(data.creditAmount || 0) : Math.abs(data.netAmount || 0);
    }

    const amountLabel = isCashReturn ? 'Refunded Cash' : 'Paid Amount';

    let currentCredit = 0;
    if (isPayment || isReturn) {
        try {
            const queryParams = new URLSearchParams({ customerName: data.customerName || data.tempCustomerName, contact: data.contactNumber || '' });
            if (data.id) queryParams.append('upToId', data.id);
            const cRes = await fetch(`/api/sales/customer/credit?${queryParams.toString()}`);
            if(cRes.ok) currentCredit = parseFloat(await cRes.text()) || 0;
        } catch(e) {}
    }

    let isCustomerCredit = isPayment || (isReturn && !isCashReturn);
    let previousCredit = isCustomerCredit ? (currentCredit + txnAmount) : (isCashReturn ? currentCredit : (currentCredit - txnAmount));

    let formattedDate = (data.entryDate || data.billDate || new Date().toISOString()).split('T')[0];

    if (isPayment || isReturn) {
        msg += `🧾 *Receipt No:* ${(isReturn ? 'RET-' : 'REC-')}${data.id}\n`;
        msg += `📅 *Date:* ${formattedDate}\n`;
        
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
        msg += `📅 *Date:* ${formattedDate}\n`;
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
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 1.5, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        let htmlContent;
        let targetId;
        if (isPayment || isReturn) {
            htmlContent = await window.generateReceiptHtml(data);
            targetId = 'receiptPrintArea';
        } else {
            htmlContent = window.generateInvoiceHtml(data, data.items || [], "INV-");
            targetId = 'waInvoicePrintArea';
        }

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0px';
        container.style.left = '0px';
        container.style.width = '680px';
        container.style.height = '0px';
        container.style.overflow = 'visible';
        container.style.zIndex = '-999999';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.background = 'transparent';
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            const targetEl = container.querySelector('#' + targetId) || container.querySelector('div') || container.firstElementChild;
            if (targetEl && targetEl.style) {
                targetEl.style.display = 'block';
            }
            pdfBase64 = await html2pdf().set(opt).from(targetEl).output('datauristring');
        } finally {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
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
