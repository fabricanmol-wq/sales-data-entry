function capitalizeWords(str) {
    if (!str) return '';
    return String(str).replace(/\b\w/g, c => c.toUpperCase());
}

document.addEventListener('blur', function(e) {
    if (e.target && e.target.matches('input[type="text"]:not(#globalSearchInput):not([autocapitalize="none"])')) {
        e.target.value = capitalizeWords(e.target.value);
    }
}, true);

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    let capitalized = capitalizeWords(String(str));
    return capitalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getLocalDateString(date = new Date()) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
}

let currentUserRole = null;
let currentUserId = null;
let currentSortBy = 'id';
let currentSortDir = 'desc';
let appSettings = { currencySymbol: '₹' };

function parseCurrency(str) {
    if (!str) return 0;
    return Number(String(str).replace(/,/g, '')) || 0;
}

function formatCurrency(amount) {
    if (typeof canViewFund === 'function' && !canViewFund()) return '--------------';
    if (amount === null || amount === undefined || amount === '') return '0.00';
    let num = Number(String(amount).replace(/,/g, ''));
    if (isNaN(num)) return amount;
    
    let isNegative = num < 0;
    num = Math.abs(num);
    let fixed = num.toFixed(2);
    
    let parts = fixed.split('.');
    let intPart = parts[0];
    
    if (intPart.length > 3) {
        let lastThree = intPart.substring(intPart.length - 3);
        let otherNumbers = intPart.substring(0, intPart.length - 3);
        intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + ',' + lastThree;
    }
    
    return (isNegative ? '-' : '') + intPart + '.' + parts[1];
}

document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.tagName !== 'INPUT') return;
    
    const idName = (target.id + ' ' + target.name).toLowerCase();
    const isAmountField = idName.includes('amount') || idName.includes('discount') || idName.includes('expenses') || 
                          idName.includes('price') || idName.includes('balance') || idName.includes('fund') || 
                          target.classList.contains('comma-input');
    
    const isContactOrId = idName.includes('contact') || idName.includes('phone') || target.id.toLowerCase().endsWith('id') || target.name.toLowerCase().endsWith('id') || 
                          idName.includes('qty') || idName.includes('quantity') || idName.includes('password') || idName.includes('username');
    
    if (isAmountField && !isContactOrId) {
        if (target.type === 'number') target.type = 'text'; // Must be text for commas
        let start = target.selectionStart;
        let oldLength = target.value.length;
        
        let rawVal = e.target.value.replace(/[^0-9.-]/g, '');
        
        if (rawVal === '-' || rawVal === '') {
            e.target.value = rawVal;
            return;
        }

        let parts = rawVal.split('.');
        let intPart = parts[0];
        
        let isNegative = false;
        if (intPart.startsWith('-')) {
            isNegative = true;
            intPart = intPart.substring(1);
        }

        if (intPart.length > 1) {
            intPart = intPart.replace(/^0+/, '');
            if (intPart === '') intPart = '0';
        }

        if (intPart.length > 3) {
            let lastThree = intPart.substring(intPart.length - 3);
            let otherNumbers = intPart.substring(0, intPart.length - 3);
            intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + ',' + lastThree;
        }
        
        let formatted = (isNegative ? '-' : '') + intPart;
        
        if (parts.length > 1) {
            formatted += '.' + parts[1].substring(0, 2);
        } else if (e.target.value.endsWith('.')) {
            formatted += '.';
        }
        
        e.target.value = formatted;
        
        let newLength = e.target.value.length;
        let diff = newLength - oldLength;
        let newCursorPos = start + diff;
        
        if (newCursorPos < 0) newCursorPos = 0;
        e.target.setSelectionRange(newCursorPos, newCursorPos);
    }
});
let uniqueCustomers = [];
let userPermissions = [];
let allSalesmen = [];
let matrixRoles = [];

// ================= ERROR LOGGING SYSTEM =================
let lastActionDetails = "Page Load";

document.addEventListener('click', (e) => {
    let el = e.target;
    // Find closest button or anchor
    while(el && el !== document && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el = el.parentNode;
    }
    if (el && el !== document) {
        lastActionDetails = "Clicked: " + (el.innerText || el.title || el.id || el.tagName).substring(0, 50).trim();
    }
}, true);

function sendErrorLog(errorMessage, stackTrace) {
    const payload = {
        errorMessage: errorMessage,
        pageUrl: window.location.href,
        actionDetails: lastActionDetails,
        stackTrace: stackTrace || ""
    };
    
    // We don't await or use standard fetch error handling here to avoid infinite loops
    try {
        fetch('/api/logs/error', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
            },
            body: JSON.stringify(payload)
        }).catch(e => console.error("Failed to send error log", e));
    } catch(e) {}
}

window.onerror = function(message, source, lineno, colno, error) {
    const stack = error ? error.stack : `${source}:${lineno}:${colno}`;
    sendErrorLog(message, stack);
    return false; // let default handler run too
};

window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const msg = reason ? (reason.message || reason.toString()) : "Unhandled Promise Rejection";
    const stack = reason ? reason.stack : "";
    sendErrorLog(msg, stack);
});
// ========================================================

function hasPermission(moduleName, action) {
    if (currentUserRole === 'ADMIN') return true;
    const perm = userPermissions.find(p => p.moduleName === moduleName);
    if (!perm) return false;
    switch(action.toUpperCase()) {
        case 'VIEW': return perm.canView;
        case 'CREATE': return perm.canCreate;
        case 'EDIT': return perm.canEdit;
        case 'DELETE': return perm.canDelete;
        case 'EXPORT': return perm.canExport;
        case 'PRINT': return perm.canPrint;
        case 'RESTORE': return perm.canRestore;
        case 'APPROVE': return perm.canApprove;
        case 'SETTINGS': return perm.canManageSettings;
        case 'ANALYTICS': return perm.canViewAnalytics;
        case 'BACKUP': return perm.canBackup;
        case 'FUND': return perm.canViewFund;
        default: return false;
    }
}
function canViewFund() {
    if (currentUserRole === 'ADMIN') return true;
    return userPermissions.some(p => p.canViewFund);
}

function generatePrint(title, contentHTML) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-1000';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Process content to remove d-print-none before printing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHTML;
    tempDiv.querySelectorAll('.d-print-none').forEach(el => el.remove());
    const cleanContent = tempDiv.innerHTML;
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title || 'Print'}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; color: black; background: white; margin: 0; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; color: black; }
                th { background-color: #f8f9fa; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-row-group; }
                .tally-table { page-break-inside: auto; }
                .tally-table th, .tally-table td { border: none; border-bottom: 1px solid #ccc; }
                .tally-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; background: transparent; }
                .tally-table .fund-col { text-align: right; }
                .tally-table tfoot th { border-top: 1px solid #000; border-bottom: 1px solid #000; }
                .text-end { text-align: right; }
                .fw-bold { font-weight: bold; }
                .mb-4 { margin-bottom: 1.5rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-0 { margin-bottom: 0; }
            </style>
        </head>
        <body>
            ${title ? `<h3 style="text-align:center; color: black; margin-bottom: 20px;">${title}</h3>` : ''}
            ${cleanContent}
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(function() {
                        window.parent.document.body.removeChild(window.frameElement);
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();
}

function exportToPDF(contentHtml, filename = 'export.pdf', title = '', orientation = 'portrait') {
    let iframe = document.getElementById('globalPrintFrame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'globalPrintFrame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title || 'PDF'}</title>
        </head>
        <body>
            <style>
                body { font-family: sans-serif; padding: 20px; color: black; background: white; margin: 0; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; color: black; word-wrap: break-word; }
                th { background-color: #f8f9fa; font-weight: bold; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-row-group; }
                .tally-table { page-break-inside: auto; width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
                .tally-table th, .tally-table td { padding: 8px 6px; border: none; border-bottom: 1px solid #ccc; text-align: left; }
                .tally-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; background: transparent !important; color: black !important; font-weight: bold; }
                .tally-table tfoot th { border-top: 1px solid #000; border-bottom: 1px solid #000; color: black !important; }
                .tally-table th:nth-child(1), .tally-table td:nth-child(1) { width: 12%; }
                .tally-table th:nth-child(2), .tally-table td:nth-child(2) { width: 40%; }
                .tally-table th:nth-child(3), .tally-table td:nth-child(3) { width: 16%; text-align: right; }
                .tally-table th:nth-child(4), .tally-table td:nth-child(4) { width: 16%; text-align: right; }
                .tally-table th:nth-child(5), .tally-table td:nth-child(5) { width: 16%; text-align: right; }
                .tally-table .fund-col { text-align: right; }
                .text-end { text-align: right !important; }
                .text-success { color: #198754 !important; }
                .text-warning { color: #d39e00 !important; }
                .fw-bold { font-weight: bold !important; }
            </style>
            ${title ? `<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
                          <div><h2 style="margin:0; font-size:22px; font-weight:bold;">${appSettings.companyName || 'Company Name'}</h2></div>
                          <div style="text-align:right;">${title}</div>
                       </div>` : ''}
            ${contentHtml}
        </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        const opt = {
            margin:       0.2,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: orientation }
        };
        html2pdf().set(opt).from(doc.body).toPdf().get('pdf').then(function (pdf) {
            var totalPages = pdf.internal.getNumberOfPages();
            for (var i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.text('Page ' + i + ' of ' + totalPages, pdf.internal.pageSize.getWidth() - 0.5, pdf.internal.pageSize.getHeight() - 0.2, { align: 'right' });
            }
        }).save();
    }, 500);
}

function generatePDF(title, contentHTML, filename, orientation = 'portrait') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHTML;
    tempDiv.querySelectorAll('.d-print-none').forEach(el => el.remove());
    exportToPDF(tempDiv.innerHTML, filename, title, orientation);
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    try {
        const authRes = await fetch('/api/auth/status');
        const authData = await authRes.json();
        if (!authData.authenticated) {
            window.location.href = '/login.html';
            return;
        }
        
        currentUserRole = authData.role;
        document.getElementById('currentUserDisplay').textContent = `${authData.username} (${authData.role})`;
        
        // Manage visible nav items
        document.querySelectorAll('[data-role-required]').forEach(el => {
            const req = el.dataset.roleRequired.split(',');
            if (!req.includes(currentUserRole)) {
                el.style.display = 'none';
            }
        });
        
        // Fetch permissions for all sections
        const permRes = await fetch('/api/permissions/me');
        if (permRes.ok) {
            userPermissions = await permRes.json();
            if (!Array.isArray(userPermissions)) {
                userPermissions = [];
            }
        } else {
            console.error('Failed to fetch permissions, setting to empty array.');
            userPermissions = [];
        }

    } catch (e) {
        console.error('Auth check failed:', e);
        userPermissions = [];
    }

    // Hotkeys
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            const key = e.key.toLowerCase();
            if (key === 'c') { e.preventDefault(); document.getElementById('nav-customers')?.click(); }
            if (key === 's') { e.preventDefault(); document.getElementById('nav-stock')?.click(); }
            if (key === 'e') { e.preventDefault(); document.getElementById('exportBtn')?.click(); }
            if (key === 'p') { e.preventDefault(); document.getElementById('printBtn')?.click(); }
        }
    });
    
    // Print Button
    document.getElementById('printBtn')?.addEventListener('click', () => {
        const content = document.querySelector('#section-entries .table-responsive')?.innerHTML || "";
        generatePrint('Sales Entries', content);
    });

        // Load Settings
        try {
            const setRes = await fetch('/api/settings');
            appSettings = await setRes.json();
            document.documentElement.setAttribute('data-bs-theme', appSettings.theme || 'light');
            if (appSettings.theme === 'dark') document.getElementById('themeToggle').innerHTML = '<i class="bi bi-sun"></i>';
            document.title = appSettings.companyName || 'Sales Data Entry';
            document.querySelector('.sidebar-heading').textContent = appSettings.companyName || 'Sales Manager';
            
            // Populate settings form
            document.getElementById('setCompanyName').value = appSettings.companyName || '';
            document.getElementById('setGstNumber').value = appSettings.gstNumber || '';
            document.getElementById('setCurrencySymbol').value = appSettings.currencySymbol || '₹';
            document.getElementById('setTaxRate').value = appSettings.taxRate || '0';
            document.getElementById('setCompanyAddress').value = appSettings.companyAddress || '';
            document.getElementById('setFinancialYearStart').value = appSettings.financialYearStart || '4';
            document.getElementById('setInvoicePrefix').value = appSettings.invoicePrefix || 'INV-';
            document.getElementById('setReminderDays').value = appSettings.reminderDays || 60;
            document.getElementById('setTheme').value = appSettings.theme || 'light';
            document.getElementById('setPrintBankDetails').value = appSettings.printBankDetails || '';
            document.getElementById('setPrintTermsConditions').value = appSettings.printTermsConditions || '';
            document.getElementById('setPrintSignatory').value = appSettings.printSignatory || '';
            document.getElementById('setPrintPaperSize').value = appSettings.printPaperSize || 'A4';
            document.getElementById('setPrintShowTax').value = appSettings.printShowTax || 'YES';
            // Print Header
            document.getElementById('printCompanyName').textContent = appSettings.companyName || 'Sales Data Entry';
        } catch (e) { console.error('Failed to load settings', e); }

        applyRoleRestrictions();
        initApp();
        if (hasPermission('Customers', 'VIEW')) {
            loadUniqueCustomers();
        }
});

function applyRoleRestrictions() {
    // 1. Hide/Show Sidebar Menus
    if (!hasPermission('Dashboard', 'VIEW')) document.querySelector('[data-target="dashboard"]')?.classList.add('d-none');
    if (!hasPermission('Calling Dashboard', 'VIEW')) document.querySelector('[data-target="calling-dashboard"]')?.classList.add('d-none');
    if (!hasPermission('Calling List', 'VIEW')) document.querySelector('[data-target="calling"]')?.classList.add('d-none');
    if (!hasPermission('Calling Reports', 'VIEW')) document.querySelector('[data-target="calling-reports"]')?.classList.add('d-none');
    if (!hasPermission('Sales Entries', 'VIEW')) document.querySelector('[data-target="entries"]')?.classList.add('d-none');
    if (!hasPermission('Customers', 'VIEW')) document.querySelector('[data-target="customers"]')?.classList.add('d-none');
    if (!hasPermission('Stock Management', 'VIEW')) document.querySelector('[data-target="stock"]')?.classList.add('d-none');
    if (!hasPermission('Accounting Vouchers', 'VIEW')) document.querySelector('[data-target="billing"]')?.classList.add('d-none');
    if (!hasPermission('Reports', 'VIEW')) document.querySelector('[data-target="reports"]')?.classList.add('d-none');
    if (!hasPermission('Salesmen', 'VIEW')) document.querySelector('[data-target="salesmen"]')?.classList.add('d-none');
    if (!hasPermission('Settings', 'VIEW')) document.querySelector('[data-target="settings"]')?.classList.add('d-none');
    if (!hasPermission('Users', 'VIEW')) document.querySelector('[data-target="users"]')?.classList.add('d-none');
    
    // 2. Hide/Show Action Buttons and Columns
    if (!hasPermission('Users', 'VIEW')) {
        document.getElementById('settingsUsersTabBtn')?.classList.add('d-none');
        document.getElementById('settingsRolesTabBtn')?.classList.add('d-none');
    }

    if (!hasPermission('Sales Entries', 'DELETE')) {
        document.querySelectorAll('.delete-bill-btn').forEach(btn => btn.classList.add('d-none'));
    }
    
    if (!canViewFund()) {
        document.body.classList.add('no-fund-view');
    }
}

function initApp() {
    setupDashboardCardClicks();
    
    // Auto-fill date inputs with today's date
    const today = getLocalDateString();
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
            input.defaultValue = today;
        }
    });

    // Sidebar Toggle
    document.getElementById('menu-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const html = document.documentElement;
        if (html.getAttribute('data-bs-theme') === 'dark') {
            html.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            html.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
    }

    // Navigation
    let systemLogsClickCount = 0;
    let systemLogsClickTimer;
    document.querySelectorAll('#sidebar-menu .list-group-item[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');

            if (target === 'errorLogs') {
                systemLogsClickCount++;
                clearTimeout(systemLogsClickTimer);
                systemLogsClickTimer = setTimeout(() => { systemLogsClickCount = 0; }, 2000);
                
                if (systemLogsClickCount >= 10) {
                    systemLogsClickCount = 0;
                    new bootstrap.Modal(document.getElementById('devAdminModal')).show();
                }
            }

            document.querySelectorAll('#sidebar-menu .list-group-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
            document.getElementById(`section-${target}`).classList.remove('d-none');
            
            // Show sharedFilterSection for entries and customers
            const filterSection = document.getElementById('sharedFilterSection');
            if (target === 'entries' || target === 'customers' || target === 'reports' || target === 'calling') {
                filterSection.classList.remove('d-none');
            } else {
                filterSection.classList.add('d-none');
            }
            
            loadSectionData(target);
        });
    });

    // Logout logic
    document.querySelectorAll('#logoutBtn, #logoutBtnTop').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                    window.location.href = '/index.html';
                });
            });
        }
    });

  // Global Enter Key Navigation for Forms
  document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
          const target = e.target;
          if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
              // Ignore enter on specific inputs like global search or modal triggers
              if (target.id === 'globalSearchInput') return;
              
              const form = target.closest('form');
              if (form) {
                  e.preventDefault(); // Prevent form submission
                  const focusables = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([disabled]), select, textarea, button[type="submit"]'));
                  const index = focusables.indexOf(target);
                  if (index > -1 && index < focusables.length - 1) {
                      focusables[index + 1].focus();
                  } else if (index === focusables.length - 1 && target.tagName === 'BUTTON') {
                      form.dispatchEvent(new Event('submit'));
                  }
              }
          }
      }
  });   // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            if (e.key === 'f') { e.preventDefault(); document.getElementById('globalSearchInput').focus(); }
            if (e.key === 's') { 
                const billingModal = document.getElementById('billingModal');
                if(billingModal && billingModal.classList.contains('show')) { 
                    e.preventDefault(); 
                    document.getElementById('btnSaveBill').click(); 
                }
            }
        }
    });

    // Initial Load
    if (currentUserRole === 'CALLING_MANAGER') {
        document.querySelector('[data-target="dashboard"]').classList.remove('active');
        document.querySelector('[data-target="calling-dashboard"]').classList.add('active');
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
        document.getElementById('section-calling-dashboard').classList.remove('d-none');
        loadSectionData('calling-dashboard');
    } else {
        loadSectionData('dashboard');
    }
    loadSalesmenDropdowns();
}

function showNotification(msg, type='success') {
    if (type === 'danger') {
        try {
            if (typeof sendErrorLog === 'function') {
                sendErrorLog("Notification Error: " + msg, "Handled Exception / API Failure");
            }
        } catch(e) {}
    }
    const area = document.getElementById('notificationArea');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    area.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// ---------------- DASHBOARD ----------------
async function loadSectionData(target) {
    if (target === 'dashboard') loadDashboard();
    if (target === 'entries') loadEntries();
    if (target === 'customers') loadUniqueCustomersTable();
    if (target === 'calling-dashboard') loadCallingDashboard();
    if (target === 'calling') loadCallingData();
    if (target === 'calling-reports') loadCallingReports();
    if (target === 'stock') loadStock();
    if (target === 'billing') loadBills();
    if (target === 'supportTicket') loadSupportTickets();
    if (target === 'settings') loadPermissionsMatrix();
    if (target === 'users' && currentUserRole === 'ADMIN') loadUsers();
    if (target === 'salesmen' && currentUserRole === 'ADMIN') loadSalesmenGrid();
    if (target === 'reports') loadReports();
    if (target === 'errorLogs') loadErrorLogs();
}

async function loadDashboard() {
    updateSupportTicketBadge();
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();
    document.getElementById('dash-overdue').textContent = data.overdueReminders;
    document.getElementById('dash-today-rem').textContent = data.todayReminders;
    document.getElementById('dash-upcoming').textContent = data.upcomingReminders;
    if (document.getElementById('dash-upcoming-title')) {
        document.getElementById('dash-upcoming-title').textContent = `Upcoming Reminders (${data.reminderIntervalDays} Days)`;
    }
    if (document.getElementById('upcomingDaysInput')) {
        document.getElementById('upcomingDaysInput').value = data.reminderIntervalDays;
    }
    
    // Additional metrics
    if(document.getElementById('dash-today-entries')) document.getElementById('dash-today-entries').textContent = data.todayEntries;
    if(document.getElementById('dash-total-customers')) document.getElementById('dash-total-customers').textContent = data.totalCustomers;
    if(document.getElementById('dash-total-qty')) document.getElementById('dash-total-qty').textContent = data.totalQuantity;

    document.getElementById('dash-today-sales').textContent = appSettings.currencySymbol + formatCurrency(data.todaySales);
    document.getElementById('dash-weekly-sales').textContent = appSettings.currencySymbol + formatCurrency(data.weeklySales);
    document.getElementById('dash-monthly-sales').textContent = appSettings.currencySymbol + formatCurrency(data.monthlySales);
    document.getElementById('dash-top-salesman').textContent = data.topSalesman;

    const tbody = document.querySelector('#recentEntriesTable tbody');
    if (tbody) {
        tbody.innerHTML = '';
        data.recentEntries.forEach(r => {
            tbody.innerHTML += `<tr><td>${r.entryDate}</td><td>${escapeHTML(r.customerName)}</td><td>${appSettings.currencySymbol}${formatCurrency(r.netAmount)}</td></tr>`;
        });
    }
}

// Reminder Modal Logic
async function openReminderModal(type) {
    let title = "Reminders";
    const settingsSection = document.getElementById('reminderSettingsSection');
    
    if (type === 'overdue') {
        title = "Overdue Reminders";
        settingsSection.style.display = 'none';
    } else if (type === 'today') {
        title = "Today's Reminders";
        settingsSection.style.display = 'none';
    } else if (type === 'upcoming') {
        title = "Upcoming Reminders";
        settingsSection.style.display = 'block';
    }
    
    document.getElementById('reminderModalTitle').textContent = title;
    
    const tbody = document.querySelector('#reminderModalTable tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    const modalEl = document.getElementById('reminderModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
        modal = new bootstrap.Modal(modalEl);
    }
    if (!modalEl.classList.contains('show')) {
        modal.show();
    }
    
    try {
        const res = await fetch(`/api/dashboard/reminders?type=${type}`);
        const data = await res.json();
        
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No reminders found</td></tr>';
            return;
        }
        
        let rowsHtml = '';
        data.forEach(r => {
            rowsHtml += `
                <tr>
                    <td>${escapeHTML(r.customerName)}</td>
                    <td>${escapeHTML(r.contactNumber || '')}</td>
                    <td>${escapeHTML(r.city || '')}</td>
                    <td class="text-danger fw-bold">${new Date(r.reminderDate).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-success me-1" onclick="markReminderDone(${r.customerId})">Done</button>
                        <button class="btn btn-sm btn-primary" onclick="openReceivePaymentFromReminder('${escapeHTML(r.customerName)}', '${escapeHTML(r.contactNumber || '')}', '${escapeHTML(r.city || '')}')">Pay</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load reminders</td></tr>';
    }
}

async function saveUpcomingDays() {
    const days = document.getElementById('upcomingDaysInput').value;
    if (!days || days < 1) {
        alert("Please enter a valid number of days");
        return;
    }
    
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reminderIntervalDays: days })
        });
        
        if (res.ok) {
            alert("Setting saved successfully");
            loadDashboard();
            // Also refresh modal list since dates might have changed
            openReminderModal('upcoming');
        } else {
            alert("Failed to save setting");
        }
    } catch (e) {
        alert("Error saving setting");
    }
}

async function markReminderDone(customerId) {
    try {
        const res = await fetch(`/api/dashboard/reminders/done/${customerId}`, {
            method: 'POST'
        });
        if (res.ok) {
            // refresh active modal content
            let type = document.getElementById('reminderModalTitle').textContent.includes('Overdue') ? 'overdue' : 
                       document.getElementById('reminderModalTitle').textContent.includes('Today') ? 'today' : 'upcoming';
            openReminderModal(type);
        } else {
            alert('Failed to mark reminder as done.');
        }
    } catch (e) {
        alert('Error communicating with server.');
    }
}

function openReceivePaymentFromReminder(customerName, contactNumber, city) {
    // Hide reminder modal
    const reminderModal = bootstrap.Modal.getInstance(document.getElementById('reminderModal'));
    if (reminderModal) {
        reminderModal.hide();
    }
    
    // Switch to entries tab
    document.querySelector('[data-target="entries"]').click();
    
    // Open new bill modal
    openNewBill('SALES');
    
    // Set to debit / receive payment
    setTimeout(() => {
        // Fill customer details FIRST
        document.getElementById('billCustomerName').value = customerName;
        document.getElementById('billContact').value = contactNumber;
        document.getElementById('billCity').value = city;
        
        // Clear paid amount
        document.getElementById('billPaidAmount').value = '';
        
        // Click to set type to DEBIT
        document.getElementById('typeDebit').checked = true;
        toggleEntryTypeMode(); // Ensure it runs to fetch the credit
    }, 300);
}

// ---------------- SALES ENTRIES ----------------
let currentPage = 0;

async function loadSalesmenDropdowns() {
    try {
        const res = await fetch('/api/salesmen');
        if (!res.ok) return;
        const data = await res.json();
        let options = '<option value="">Select Salesman</option>';
        data.forEach(s => {
            if(s.status === 'Active') options += `<option value="${s.id}">${s.name}</option>`;
        });
        const filterSalesman = document.getElementById('filterSalesman');
        if (filterSalesman) filterSalesman.innerHTML = options;
        const entrySalesman = document.getElementById('entrySalesman');
        if (entrySalesman) entrySalesman.innerHTML = options;
    } catch(e) { console.error('Error loading salesmen:', e); }
}

// Quick Date Filters
document.querySelectorAll('.btn-quick-date').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const range = e.target.dataset.range;
        const today = new Date();
        let start = new Date();
        let end = new Date();
        
        if (range === 'today') { /* defaults to today */ }
        else if (range === 'yesterday') { start.setDate(start.getDate()-1); end.setDate(end.getDate()-1); }
        else if (range === 'last7') { start.setDate(start.getDate()-7); }
        else if (range === 'last30') { start.setDate(start.getDate()-30); }
        else if (range === 'thisMonth') { start.setDate(1); }
        else if (range === 'lastMonth') { start.setMonth(start.getMonth()-1); start.setDate(1); end.setDate(0); }
        
        document.querySelector('input[name="startDate"]').value = getLocalDateString(start);
        document.querySelector('input[name="endDate"]').value = getLocalDateString(end);
        
        if (!document.getElementById('section-entries').classList.contains('d-none')) {
            loadEntries();
        } else if (!document.getElementById('section-customers').classList.contains('d-none')) {
            loadUniqueCustomersTable();
        } else if (!document.getElementById('section-reports').classList.contains('d-none')) {
            loadReports();
        }
    });
});

// Sorting
document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const sort = th.dataset.sort;
        if (currentSortBy === sort) {
            currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortBy = sort;
            currentSortDir = 'asc';
        }
        loadEntries();
    });
});

async function loadEntries() {
    const formData = new FormData(document.getElementById('filterForm'));
    if (formData.get('minAmount')) formData.set('minAmount', formData.get('minAmount').replace(/,/g, ''));
    if (formData.get('maxAmount')) formData.set('maxAmount', formData.get('maxAmount').replace(/,/g, ''));
    
    const filters = new URLSearchParams(formData);
    const size = document.getElementById('pageSize').value;
    filters.append('page', currentPage);
    filters.append('size', size);
    filters.append('sortBy', currentSortBy);
    filters.append('direction', currentSortDir);

    const res = await fetch(`/api/sales?${filters.toString()}`);
    if (!res.ok) {
        console.error("Failed to load entries:", await res.text());
        return;
    }
    const data = await res.json();
    
    const tbody = document.getElementById('entriesTableBody');
    tbody.innerHTML = '';
    
    let sumBill = 0, sumDisc = 0, sumNet = 0, sumDebit = 0, sumCredit = 0, sumQty = 0;

    if (!data || !data.content) return;
    
    data.content.forEach(r => {
        const salesmanName = r.salesman ? r.salesman.name : '';
        let actions = '';
        if (currentUserRole === 'ADMIN' || (currentUserRole === 'DATA_ENTRY_MANAGER' && r.createdBy && r.createdBy.id === currentUserId)) {
            actions += `<button class="btn btn-sm btn-primary edit-entry me-1" data-id="${r.id}"><i class="bi bi-pencil"></i></button>`;
        }
        if (currentUserRole === 'ADMIN') {
            actions += `<button class="btn btn-sm btn-danger delete-entry" data-id="${r.id}"><i class="bi bi-trash"></i></button>`;
        }
        
        const isOverdue = r.reminderDate && (new Date(r.reminderDate) < new Date(new Date().setHours(0,0,0,0)));
        const rowClass = isOverdue ? 'table-danger' : '';
        
        let typeBadge = '';
        if (r.billType === 'CASH_BILL' || r.billType === 'CASH') typeBadge = '<span class="badge bg-success">CASH</span>';
        else if (r.billType === 'CREDIT_BILL' || r.billType === 'CREDIT') typeBadge = '<span class="badge bg-warning text-dark">CREDIT</span>';
        else if (r.billType === 'PAYMENT_RECEIVED' || r.billType === 'DEBIT') typeBadge = '<span class="badge bg-info">DEBIT</span>';
        else if (r.billType === 'PRODUCT_RETURN') typeBadge = '<span class="badge bg-danger">RETURN (CR)</span>';
        else if (r.billType === 'CASH_RETURN') typeBadge = '<span class="badge bg-danger">RETURN (CASH)</span>';
        else typeBadge = `<span class="badge bg-secondary">${r.billType}</span>`;
        
        let debitPaid = 0;
        let creditPending = 0;

        // Calculate Paid/Debit and Credit based on entry type
        if (r.billType === 'PAYMENT_RECEIVED' || r.billType === 'DEBIT' || r.billType === 'PRODUCT_RETURN') {
            debitPaid = -(r.creditAmount || 0); // Credit amount is negative for received payments
            creditPending = (r.creditAmount || 0); // Show negative to correctly subtract from Grand Total
        } else {
            creditPending = (r.creditAmount || 0);
            debitPaid = (r.netAmount || 0) - creditPending;
        }

        let displayCreditPending = creditPending;
        if (r.billType === 'PAYMENT_RECEIVED' || r.billType === 'DEBIT' || r.billType === 'PRODUCT_RETURN') {
            displayCreditPending = 0; // The user wants this to display as 0
        }

        tbody.innerHTML += `<tr class="${rowClass}">
            <td>${r.id}</td>
            <td>${typeBadge}</td>
            <td>${r.entryDate}</td>
            <td>${escapeHTML(r.customerName || '')}</td>
            <td>${escapeHTML(r.city || '')}</td>
            <td>${escapeHTML(r.contactNumber || '')}</td>
            <td>${salesmanName}</td>
            <td>${r.quantity || 0}</td>
            <td class="fund-col">${appSettings.currencySymbol}${formatCurrency(r.billAmount)}</td>
            <td class="fund-col">${appSettings.currencySymbol}${(r.discount * (r.quantity || 1)).toFixed(2)}</td>
            <td class="fund-col">${appSettings.currencySymbol}${formatCurrency(r.netAmount)}</td>
            <td class="fund-col text-success">${appSettings.currencySymbol}${formatCurrency(debitPaid)}</td>
            <td class="fund-col text-danger">${appSettings.currencySymbol}${formatCurrency(displayCreditPending)}</td>
            <td class="d-print-none text-nowrap">
                <button class="btn btn-sm btn-secondary view-bill" title="View Bill" data-remarks="${escapeHTML(r.remarks)}" data-id="${r.id}"><i class="bi bi-printer"></i></button>
                ${actions}
            </td>
        </tr>`;
        
        sumBill += r.billAmount || 0;
        sumDisc += (r.discount * (r.quantity || 1)) || 0;
        sumNet += r.netAmount || 0;
        sumDebit += debitPaid;
        sumCredit += creditPending;
        sumQty += r.quantity || 0;
    });
    
    document.getElementById('totalQty').textContent = sumQty;
    document.getElementById('totalBillAmt').textContent = appSettings.currencySymbol + formatCurrency(sumBill);
    document.getElementById('totalDisc').textContent = appSettings.currencySymbol + formatCurrency(sumDisc);
    document.getElementById('totalNetAmt').textContent = appSettings.currencySymbol + formatCurrency(sumNet);
    if(document.getElementById('totalDebitAmt')) document.getElementById('totalDebitAmt').textContent = appSettings.currencySymbol + formatCurrency(sumDebit);
    document.getElementById('totalCreditAmt').textContent = appSettings.currencySymbol + formatCurrency(sumCredit);
    
    document.getElementById('pageInfo').textContent = `Page ${data.number + 1} of ${data.totalPages || 1}`;
    document.getElementById('prevPage').disabled = data.first;
    document.getElementById('nextPage').disabled = data.last;

    document.querySelectorAll('.edit-entry').forEach(btn => btn.addEventListener('click', (e) => editEntry(e.currentTarget.dataset.id, data.content)));
    document.querySelectorAll('.delete-entry').forEach(btn => btn.addEventListener('click', (e) => deleteEntry(e.currentTarget.dataset.id, 'entry')));
    document.querySelectorAll('.view-bill').forEach(btn => btn.addEventListener('click', (e) => viewBillFromLedger(e.currentTarget, data.content)));
}

async function viewBillFromLedger(btn, entriesList) {
    const remarks = btn.dataset.remarks;
    if (remarks && remarks.includes('Invoice #')) {
        const billId = remarks.replace('Invoice #', '').trim();
        printOldInvoice(billId);
    } else {
        const id = parseInt(btn.dataset.id);
        const record = entriesList ? entriesList.find(x => x.id === id) : null;
        if (record) {
            printReceipt(record);
        } else {
            showNotification('This entry does not have a detailed bill attached.', 'info');
        }
    }
}

document.getElementById('filterForm')?.addEventListener('submit', (e) => { 
    e.preventDefault(); 
    currentPage = 0; 
    if (!document.getElementById('section-entries').classList.contains('d-none')) {
        loadEntries();
    } else if (!document.getElementById('section-customers').classList.contains('d-none')) {
        loadUniqueCustomersTable();
    } else if (!document.getElementById('section-reports').classList.contains('d-none')) {
        loadReports();
    } else if (!document.getElementById('section-calling').classList.contains('d-none')) {
        loadCallingData();
    }
});
document.getElementById('prevPage').addEventListener('click', () => { currentPage--; loadEntries(); });
document.getElementById('nextPage').addEventListener('click', () => { currentPage++; loadEntries(); });
document.getElementById('pageSize').addEventListener('change', () => { currentPage = 0; loadEntries(); });

// Auto Calculate Net
function calculateNet() {
    console.trace('calculateNet called!');
    const entryBillEl = document.getElementById('entryBill');
    if (!entryBillEl) return;
    const bill = parseCurrency(entryBillEl.value) || 0;
    const quantityEl = document.querySelector('input[name="quantity"]');
    const quantity = quantityEl ? (parseCurrency(quantityEl.value) || 1) : 1;
    const entryDiscountEl = document.getElementById('entryDiscount');
    const discount = entryDiscountEl ? (parseCurrency(entryDiscountEl.value) || 0) : 0;
    const totalDiscount = quantity * discount;
    const entryNetEl = document.getElementById('entryNet');
    if (entryNetEl) entryNetEl.value = formatCurrency(bill - totalDiscount);
}


// Removed billType radio listeners as it's now just an Edit Ledger modal

// Customer Autofill Logic
function applyAutofill(match, inputEl) {
    if (match) {
        // Disable autofilling the whole row if we're in the global search filter
        const formEl = inputEl.closest('form');
        if (formEl && formEl.id === 'filterForm') {
            return;
        }

        const container = inputEl.closest('.modal-body') || inputEl.closest('.card-body') || inputEl.closest('form');
        if (container) {
            const customerEl = container.querySelector('.autofill-customer');
            const contactEl = container.querySelector('.autofill-contact');
            const cityEl = container.querySelector('.autofill-city');
            
            if (customerEl) customerEl.value = match.customerName || '';
            if (contactEl) contactEl.value = match.contactNumber || '';
            if (cityEl) cityEl.value = match.city || '';
            
            // If we are in the billing modal and DEBIT is selected, we need to update bakaya
            if (container.closest('#billingModal') && typeof toggleEntryTypeMode === 'function') {
                toggleEntryTypeMode();
            }
            
            const modal = container.closest('.modal');
            const salesmanEl = modal ? modal.querySelector('#entrySalesman') : document.getElementById('entrySalesman');
            if (match.lastSalesmanId && salesmanEl) {
                salesmanEl.value = match.lastSalesmanId;
            }
            
            const billSalesmanEl = modal ? modal.querySelector('#billSalesman') : document.getElementById('billSalesman');
            if (billSalesmanEl) {
                if (match.nextSalesmanId) {
                    billSalesmanEl.value = match.nextSalesmanId;
                } else if (match.lastSalesmanId) {
                    billSalesmanEl.value = match.lastSalesmanId;
                }
            }
            
            const billDiscountEl = modal ? modal.querySelector('#billDiscount') : document.getElementById('billDiscount');
            if (match.fixedDiscount !== undefined && billDiscountEl) {
                billDiscountEl.value = match.fixedDiscount;
                if (typeof calculateBill === 'function') calculateBill();
            }
            
            if (match.totalCredit !== undefined) {
                currentCustomerCredit = match.totalCredit;
                if (typeof calculateBill === 'function') calculateBill();
            }
        }
    }
}

function renderDropdown(inputEl, dropdownEl, filterField, displayFormat) {
    if (!dropdownEl) return;
    let val = inputEl.value.trim().toLowerCase();
    dropdownEl.innerHTML = '';
    if (!val) {
        dropdownEl.classList.remove('show');
        return;
    }
    
    // Filter matching customers
    const uniqueValues = new Set();
    const matches = uniqueCustomers.filter(c => {
        if (!c[filterField]) return false;
        const disp = displayFormat(c);
        if (uniqueValues.has(disp)) return false;
        if (c[filterField].toLowerCase().includes(val)) {
            uniqueValues.add(disp);
            return true;
        }
        return false;
    }).sort((a, b) => {
        const aStarts = a[filterField].toLowerCase().startsWith(val);
        const bStarts = b[filterField].toLowerCase().startsWith(val);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
    }).slice(0, 10); // Show up to 10 suggestions
    
    if (matches.length === 0) {
        dropdownEl.classList.remove('show');
        return;
    }
    
    matches.forEach(match => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'dropdown-item';
        a.href = '#';
        a.textContent = displayFormat(match);
        a.addEventListener('click', (e) => {
            e.preventDefault();
            inputEl.value = match[filterField];
            // Only apply full row autofill if we are not just picking a city
            if (filterField !== 'city') {
                applyAutofill(match, inputEl);
            }
            dropdownEl.classList.remove('show');
        });
        li.appendChild(a);
        dropdownEl.appendChild(li);
    });
    
    dropdownEl.classList.add('show');
}

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('autofill-customer')) {
        const dropdown = e.target.nextElementSibling;
        if (dropdown && dropdown.classList.contains('dropdown-menu')) {
            renderDropdown(e.target, dropdown, 'customerName', (m) => m.customerName + (m.contactNumber ? " - " + m.contactNumber : ""));
            const val = e.target.value.trim().toLowerCase();
            const matches = uniqueCustomers.filter(c => c.customerName && c.customerName.toLowerCase() === val);
            if(matches.length === 1) applyAutofill(matches[0], e.target);
        }
    } else if (e.target.classList.contains('autofill-contact')) {
        const dropdown = e.target.nextElementSibling;
        if (dropdown && dropdown.classList.contains('dropdown-menu')) {
            renderDropdown(e.target, dropdown, 'contactNumber', (m) => m.customerName + " - " + m.contactNumber);
            const val = e.target.value.trim();
            const matches = uniqueCustomers.filter(c => c.contactNumber && c.contactNumber === val);
            if(matches.length === 1) applyAutofill(matches[0], e.target);
        }
    } else if (e.target.classList.contains('autofill-city')) {
        const dropdown = e.target.nextElementSibling;
        if (dropdown && dropdown.classList.contains('dropdown-menu')) {
            renderDropdown(e.target, dropdown, 'city', (m) => m.city);
            // Do not auto-fill customer name/contact based on city match
            // because multiple customers can belong to the same city.
        }
    }
});

document.addEventListener('keydown', (e) => {
    const dropdown = document.querySelector('.dropdown-menu.show');
    if (!dropdown) return;
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    const activeIndex = items.findIndex(item => item === document.activeElement);
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < items.length - 1) items[activeIndex + 1].focus();
        else items[0].focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) items[activeIndex - 1].focus();
        else items[items.length - 1].focus();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.position-relative') && !e.target.closest('.dropdown')) {
        document.querySelectorAll('.autofill-customer + .dropdown-menu.show, .autofill-contact + .dropdown-menu.show, .autofill-city + .dropdown-menu.show').forEach(dd => dd.classList.remove('show'));
    }
});

async function editEntry(id, currentData) {
    const record = currentData.find(r => r.id == id);
    if (!record) return;
    
    // If this is a SalesRecord that is linked to a Bill, find the bill and edit it.
    if (record.remarks && record.remarks.startsWith('Invoice #')) {
        const billId = record.remarks.replace('Invoice #', '');
        try {
            const res = await fetch(`/api/billing/${billId}`);
            if (res.ok) {
                const bill = await res.json();
                return editBill(bill);
            }
        } catch(e) {}
    }
    
    // Otherwise, edit it as a standalone DEBIT entry
    editingBillId = null;
    editingSalesRecordId = record.id;
    editingSalesRecordDate = record.entryDate;
    currentBillItems = [];
    
    document.getElementById('billCustomerName').value = record.customerName;
    document.getElementById('billContact').value = record.contactNumber;
    document.getElementById('billCity').value = record.city || '';
    
    // Load current credit
    try {
        const res = await fetch(`/api/sales/customer/credit?customerName=${encodeURIComponent(record.customerName)}&contact=${record.contactNumber}`);
        currentCustomerCredit = parseCurrency(await res.text()) || 0;
    } catch(e) {
        currentCustomerCredit = record.creditAmount || 0;
    }
    
    document.getElementById('typeDebit').checked = true;
    document.getElementById('typeCash').disabled = true;
    document.getElementById('typeCredit').disabled = true;
    document.getElementById('typeDebit').disabled = false;
    
    toggleEntryTypeMode();
    
    // For DEBIT, the amount received is stored as a negative creditAmount
    const receivedAmount = record.creditAmount < 0 ? Math.abs(record.creditAmount) : 0;
    document.getElementById('billPaidAmount').value = receivedAmount;
    
    const isProductReturnEl = document.getElementById('billIsProductReturn');
    const returnTypeContainer = document.getElementById('returnTypeContainer');
    if (isProductReturnEl) {
        isProductReturnEl.checked = (record.billType === 'PRODUCT_RETURN' || record.billType === 'CASH_RETURN');
        if (returnTypeContainer) {
            returnTypeContainer.style.display = isProductReturnEl.checked ? 'block' : 'none';
        }
        
        if (record.billType === 'CASH_RETURN') {
            document.getElementById('returnTypeCash').checked = true;
        } else {
            document.getElementById('returnTypeCredit').checked = true;
        }
    }
    
    new bootstrap.Modal(document.getElementById('billingModal')).show();
}

// Generic Delete
let deleteId = null;
let deleteType = null;
let deleteModalInstance = null;

function deleteEntry(id, type) {
    deleteId = id;
    deleteType = type;
    if (!deleteModalInstance) {
        deleteModalInstance = new bootstrap.Modal(document.getElementById('deleteModal'));
    }
    deleteModalInstance.show();
}
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!deleteId) return;
    let url = '';
    if (deleteType === 'entry') url = `/api/sales/${deleteId}`;
    if (deleteType === 'bill') url = `/api/billing/${deleteId}`;
    if (deleteType === 'user') url = `/api/users/${deleteId}`;
    if (deleteType === 'salesman') url = `/api/salesmen/${deleteId}`;
    if (deleteType === 'callingReport') url = `/api/calling/record/${deleteId}`;

    try {
        const res = await fetch(url, { method: 'DELETE' });
        if (res.ok) {
            showNotification('Deleted successfully');
            if (deleteModalInstance) deleteModalInstance.hide();
            if (deleteType === 'entry') loadEntries();
            if (deleteType === 'bill') loadBills();
            if (deleteType === 'user') loadUsers();
            if (deleteType === 'salesman') loadSalesmenGrid();
            if (deleteType === 'callingReport') loadCallingReports();
            if (typeof loadDashboard === 'function') loadDashboard();
            if (typeof loadUniqueCustomersTable === 'function') loadUniqueCustomersTable();
        } else {
            showNotification('Error deleting record', 'danger');
        }
    } catch(e) {
        showNotification('Error: ' + e.message, 'danger');
    }
});


// Exports
document.getElementById('exportBtn').addEventListener('click', () => {
    const filters = new URLSearchParams(new FormData(document.getElementById('filterForm')));
    window.location.href = `/api/export/excel?${filters.toString()}`;
});
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const filters = new URLSearchParams(new FormData(document.getElementById('filterForm')));
    window.location.href = `/api/export/csv?${filters.toString()}`;
});
document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const originalTable = document.querySelector('#section-entries .table-responsive').innerHTML;
    const titleHtml = `<h2 style="margin:0; font-size:20px; font-weight:bold;">SALES ENTRIES</h2><div style="font-size:12px; margin-top:5px;">${getLocalDateString()}</div>`;
    generatePDF(titleHtml, originalTable, `Sales_Entries_${getLocalDateString()}.pdf`, 'landscape');
});

// ---------------- CUSTOMERS ----------------
async function loadUniqueCustomers() {
    try {
        const res = await fetch('/api/customers');
        uniqueCustomers = await res.json();
        
        // Clear Datalist initially if exists
        const custDatalist = document.getElementById('customerList');
        if (custDatalist) custDatalist.innerHTML = '';
    } catch (e) { console.error('Failed to load customers', e); }
}

async function loadUniqueCustomersTable() {
    try {
        const formData = new FormData(document.getElementById('filterForm'));
        if (formData.get('minAmount')) formData.set('minAmount', formData.get('minAmount').replace(/,/g, ''));
        if (formData.get('maxAmount')) formData.set('maxAmount', formData.get('maxAmount').replace(/,/g, ''));
        
        const filters = new URLSearchParams(formData);
        const res = await fetch(`/api/customers?${filters.toString()}`);
        let filteredCustomers = await res.json();
        
        // Sort A to Z by customer name
        filteredCustomers.sort((a, b) => (a.customerName || '').trim().toLowerCase().localeCompare((b.customerName || '').trim().toLowerCase()));
        
        const tbody = document.querySelector('#customersTable tbody');
        tbody.innerHTML = '';
        
        let sumPendingCredit = 0;
        
        filteredCustomers.forEach(c => {
            if (!c.customerName) return;
            const displayCredit = Math.max(0, c.totalCredit || 0);
            sumPendingCredit += displayCredit;
            tbody.innerHTML += `<tr>
                <td><a href="#" class="customer-link" data-name="${escapeHTML(c.customerName)}" data-contact="${escapeHTML(c.contactNumber)}">${escapeHTML(c.customerName)}</a></td>
                <td>${escapeHTML(c.contactNumber)}</td>
                <td>${escapeHTML(c.city || '')}</td>
                <td class="fund-col"><span class="${c.totalCredit > 0 ? 'text-danger' : 'text-success'} fw-bold">${appSettings.currencySymbol}${formatCurrency(displayCredit)}</span></td>
                <td class="d-print-none">
                    <button class="btn btn-sm btn-outline-primary me-2 edit-customer-btn" onclick="editCustomer(${c.id})" title="Edit Customer"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-secondary view-ledger-btn" data-name="${escapeHTML(c.customerName)}" data-contact="${escapeHTML(c.contactNumber)}"><i class="bi bi-journal-text"></i> Ledger</button>
                    <button class="btn btn-sm btn-success pay-credit-btn ms-1" data-name="${escapeHTML(c.customerName)}" data-contact="${escapeHTML(c.contactNumber)}">Receive Payment</button>
                    ${currentUserRole === 'ADMIN' ? `<button class="btn btn-sm btn-danger ms-1 delete-customer-btn" data-id="${c.id}" data-name="${escapeHTML(c.customerName)}" data-contact="${escapeHTML(c.contactNumber)}"><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        });
        
        const totalEl = document.getElementById('customersTotalCreditAmt');
        if (totalEl) totalEl.textContent = appSettings.currencySymbol + formatCurrency(sumPendingCredit);

        document.querySelectorAll('.customer-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const name = e.currentTarget.dataset.name;
                // Navigate to Sales Entries and apply filter
                document.querySelectorAll('#sidebar-menu .list-group-item').forEach(l => l.classList.remove('active'));
                document.querySelector('[data-target="entries"]').classList.add('active');
                document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
                document.getElementById('section-entries').classList.remove('d-none');
                document.getElementById('sharedFilterSection').classList.remove('d-none');
                
                const contact = e.currentTarget.dataset.contact;
                document.getElementById('globalSearchInput').value = contact ? contact : name;
                currentPage = 0;
                loadEntries();
            });
        });

        document.querySelectorAll('.delete-customer-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const name = e.currentTarget.dataset.name;
                const contact = e.currentTarget.dataset.contact;
                if(confirm(`Are you sure you want to delete customer ${name}? This will delete all their sales records and bills permanently.`)) {
                    try {
                        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
                        if(res.ok) {
                            showNotification('Customer deleted successfully');
                            loadUniqueCustomersTable();
                            loadUniqueCustomers();
                        } else {
                            showNotification('Failed to delete customer', 'danger');
                        }
                    } catch(err) {
                        showNotification('Error deleting customer', 'danger');
                    }
                }
            });
        });
        
        document.querySelectorAll('.pay-credit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const customerName = e.currentTarget.dataset.name;
                const contactNumber = e.currentTarget.dataset.contact || '';
                
                // Clear all fields and init modal first
                await openNewBill('SALES');
                
                // Fill details
                document.getElementById('billCustomerName').value = customerName;
                document.getElementById('billContact').value = contactNumber;
                
                const match = uniqueCustomers.find(c => c.customerName === customerName && (c.contactNumber || '') === contactNumber);
                if (match && match.city) {
                    document.getElementById('billCity').value = match.city;
                }
                
                // Switch to debit / receive payment
                document.getElementById('typeDebit').click();
                toggleEntryTypeMode(); // Fetch credit
            });
        });

        document.querySelectorAll('.view-ledger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                viewLedger(e.currentTarget.dataset.name, e.currentTarget.dataset.contact);
            });
        });
    } catch (e) { console.error('Failed to load customer table', e); }
}

// Payment Submission Logic
document.getElementById('newCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    
    const data = Object.fromEntries(new FormData(e.target));
    // Capitalize fields
    const capitalize = s => s && typeof s === 'string' ? s.replace(/\b\w/g, c => c.toUpperCase()) : s;
    if (data.customerName) data.customerName = capitalize(data.customerName);
    if (data.city) data.city = capitalize(data.city);

    try {
        const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showNotification('Customer created successfully');
            bootstrap.Modal.getInstance(document.getElementById('newCustomerModal')).hide();
            e.target.reset();
            loadUniqueCustomersTable();
            loadUniqueCustomers();
        } else {
            const err = await res.text();
            showNotification('Error: ' + err, 'danger');
        }
    } catch(err) {
        showNotification('Failed to create customer', 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
});



async function viewLedger(customerName, contactNumber) {
    try {
        const customer = uniqueCustomers.find(c => c.customerName === customerName && (c.contactNumber || '') === (contactNumber || ''));
        const cityStr = customer && customer.city ? ` (${customer.city})` : '';
        document.getElementById('ledgerCustomerName').textContent = customerName + (contactNumber ? ` - ${contactNumber}` : '') + cityStr;
        document.getElementById('ledgerCustomerName').dataset.customer = customerName;
        document.getElementById('ledgerCustomerName').dataset.contact = contactNumber || '';
        
        // Reset filters to ALL initially
        document.getElementById('ledgerDateFilter').value = 'ALL';
        document.getElementById('ledgerStartDate').classList.add('d-none');
        document.getElementById('ledgerEndDate').classList.add('d-none');
        
        await fetchAndRenderLedger();
        new bootstrap.Modal(document.getElementById('ledgerModal')).show();
    } catch (e) {
        console.error('Failed to load ledger', e);
        showNotification('Failed to load ledger', 'danger');
    }
}

document.getElementById('ledgerDateFilter').addEventListener('change', (e) => {
    const val = e.target.value;
    const start = document.getElementById('ledgerStartDate');
    const end = document.getElementById('ledgerEndDate');
    if (val === 'CUSTOM') {
        start.classList.remove('d-none');
        end.classList.remove('d-none');
    } else {
        start.classList.add('d-none');
        end.classList.add('d-none');
        fetchAndRenderLedger();
    }
});
document.getElementById('ledgerStartDate').addEventListener('change', fetchAndRenderLedger);
document.getElementById('ledgerEndDate').addEventListener('change', fetchAndRenderLedger);

async function fetchAndRenderLedger() {
    try {
        const customerName = document.getElementById('ledgerCustomerName').dataset.customer;
        const contactNumber = document.getElementById('ledgerCustomerName').dataset.contact;
    const queryParams = new URLSearchParams({ customerName: customerName, contactNumber: contactNumber });
    queryParams.append('size', 5000);
    queryParams.append('sortBy', 'entryDate');
    queryParams.append('sortDir', 'ASC');

    const res = await fetch(`/api/sales?${queryParams.toString()}`);
    const data = await res.json();
    
    let filterStartDate = null;
    let filterEndDate = null;
    const filter = document.getElementById('ledgerDateFilter').value;
    if (filter === 'TODAY') {
        const todayStr = getLocalDateString();
        filterStartDate = new Date(todayStr);
        filterEndDate = new Date(todayStr);
    } else if (filter === 'CUSTOM') {
        const sDate = document.getElementById('ledgerStartDate').value;
        const eDate = document.getElementById('ledgerEndDate').value;
        if (sDate) filterStartDate = new Date(sDate);
        if (eDate) filterEndDate = new Date(eDate);
    }
    
    const tbody = document.querySelector('#ledgerTable tbody');
    tbody.innerHTML = '';
    
    let openingBalance = 0;
    let ledgerLines = [];
    
    data.content.forEach(r => {
        const rDate = new Date(r.entryDate);
        rDate.setHours(0,0,0,0);
        
        let isBefore = false;
        if (filterStartDate) {
            let fs = new Date(filterStartDate);
            fs.setHours(0,0,0,0);
            if (rDate < fs) isBefore = true;
        }
        
        let isAfter = false;
        if (filterEndDate) {
            let fe = new Date(filterEndDate);
            fe.setHours(0,0,0,0);
            if (rDate > fe) isAfter = true;
        }
        
        const dateStr = rDate.toLocaleDateString();
        let isPayment = r.creditAmount < 0;
        
        if (isBefore) {
            if (r.billType === 'CASH_RETURN') {
                // Cash return doesn't affect Udhar balance
            } else if (isPayment || r.billType === 'PRODUCT_RETURN') {
                openingBalance -= Math.abs(r.creditAmount);
            } else {
                openingBalance += r.netAmount;
                let immediatePayment = r.netAmount - r.creditAmount;
                if (immediatePayment > 0) openingBalance -= immediatePayment;
            }
        } else if (!isAfter) {
            if (r.billType === 'PRODUCT_RETURN') {
                ledgerLines.push({
                    date: dateStr,
                    narration: 'PRODUCT RETURN (CREDIT)' + (r.remarks ? ` - ${escapeHTML(r.remarks)}` : ''),
                    debit: 0,
                    credit: Math.abs(r.creditAmount),
                    ignoreBalance: false
                });
            } else if (r.billType === 'CASH_RETURN') {
                ledgerLines.push({
                    date: dateStr,
                    narration: 'PRODUCT RETURN (CASH)' + (r.remarks ? ` - ${escapeHTML(r.remarks)}` : ''),
                    debit: 0,
                    credit: r.netAmount, // negative
                    ignoreBalance: true
                });
            } else if (isPayment) {
                ledgerLines.push({
                    date: dateStr,
                    narration: 'CASH' + (r.remarks ? ` - ${escapeHTML(r.remarks)}` : ''),
                    debit: 0,
                    credit: Math.abs(r.creditAmount)
                });
            } else {
                ledgerLines.push({
                    date: dateStr,
                    narration: r.remarks ? r.remarks : 'Sales Bill',
                    debit: r.netAmount,
                    credit: 0
                });
                let immediatePayment = r.netAmount - r.creditAmount;
                if (immediatePayment > 0) {
                    ledgerLines.push({
                        date: dateStr,
                        narration: 'CASH',
                        debit: 0,
                        credit: immediatePayment
                    });
                }
            }
        }
    });
        
        let runningBalance = openingBalance;
        let totalDebits = 0;
        let totalCredits = 0;

        let openingStrRow = '0.00';
        if (openingBalance > 0.001) openingStrRow = `${formatCurrency(openingBalance)} DR`;
        else if (openingBalance < -0.001) openingStrRow = `${formatCurrency(Math.abs(openingBalance))} CR`;
        
        let obDateStr = filterStartDate ? filterStartDate.toLocaleDateString() : '';
        
        tbody.innerHTML += `<tr class="fw-bold" style="background-color: #f8f9fa;">
            <td>${obDateStr}</td>
            <td>Opening Balance</td>
            <td></td>
            <td></td>
            <td class="text-end fund-col ${openingBalance > 0.001 ? 'text-warning' : (openingBalance < -0.001 ? 'text-success' : '')}">${openingStrRow}</td>
        </tr>`;
        
        ledgerLines.forEach(line => {
            if (!line.ignoreBalance) {
                runningBalance += line.debit;
                runningBalance -= line.credit;
            }
            totalDebits += line.debit;
            totalCredits += line.credit;
            
            let balanceStr = '0.00';
            if (runningBalance > 0.001) balanceStr = `${formatCurrency(runningBalance)} DR`;
            else if (runningBalance < -0.001) balanceStr = `${formatCurrency(Math.abs(runningBalance))} CR`;
            
            let debitStr = line.debit > 0 ? formatCurrency(line.debit) : (line.debit < 0 ? formatCurrency(line.debit) : '');
            let creditStr = line.credit > 0 ? formatCurrency(line.credit) : (line.credit < 0 ? formatCurrency(line.credit) : '');
            
            tbody.innerHTML += `<tr>
                <td>${line.date}</td>
                <td>${line.narration}</td>
                <td class="text-end fund-col">${debitStr}</td>
                <td class="text-end fund-col text-success">${creditStr}</td>
                <td class="text-end fw-bold text-warning fund-col">${balanceStr}</td>
            </tr>`;
        });
        
        let openingStr = '0.00 DR';
        if (openingBalance > 0.001) openingStr = `${formatCurrency(openingBalance)} DR`;
        else if (openingBalance < -0.001) openingStr = `${formatCurrency(Math.abs(openingBalance))} CR`;

        let closingStr = '0.00 DR';
        if (runningBalance > 0.001) closingStr = `${formatCurrency(runningBalance)} DR`;
        else if (runningBalance < -0.001) closingStr = `${formatCurrency(Math.abs(runningBalance))} CR`;
        
        document.getElementById('ledgerTotalDebits').textContent = formatCurrency(totalDebits);
        document.getElementById('ledgerTotalCredits').textContent = formatCurrency(totalCredits);
        document.getElementById('ledgerOpeningBalance').textContent = openingStr;
        document.getElementById('ledgerClosingBalance').textContent = closingStr;
    } catch (e) {
        console.error('Failed to load ledger', e);
        showNotification('Failed to load ledger', 'danger');
    }
}

async function openPaymentFromLedger() {
    const customerName = document.getElementById('ledgerCustomerName').dataset.customer || document.getElementById('ledgerCustomerName').textContent;
    const contactNumber = document.getElementById('ledgerCustomerName').dataset.contact || '';
    const customer = uniqueCustomers.find(c => c.customerName === customerName && (c.contactNumber || '') === contactNumber);
    
    document.getElementById('billCustomerName').value = customer ? customer.customerName : customerName;
    document.getElementById('billContact').value = customer ? customer.contactNumber : contactNumber;
    
    if (customer) applyAutofill(customer, document.getElementById('billCustomerName'));
    
    document.getElementById('billPaidAmount').value = '';
    document.getElementById('typeDebit').checked = true;
    await toggleEntryTypeMode();
    
    await loadProductsAndSalesmenForBill();
    
    bootstrap.Modal.getInstance(document.getElementById('ledgerModal')).hide();
    setTimeout(() => {
        new bootstrap.Modal(document.getElementById('billingModal')).show();
    }, 400);
}

function printLedger() {
    const tableEl = document.getElementById('ledgerTable');
    const customerHeader = document.getElementById('ledgerCustomerName').textContent;
    const dateRange = document.getElementById('ledgerDateFilter').value !== 'ALL' 
        ? `${document.getElementById('ledgerStartDate').value} - ${document.getElementById('ledgerEndDate').value}` 
        : 'All Time';

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; font-family: sans-serif;">
            <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">${appSettings.companyName || 'Company Name'}</h2>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">LEDGER</h2>
                <div style="font-size: 12px; margin-top: 5px;">${dateRange}</div>
            </div>
        </div>
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px; font-family: sans-serif;">A/c of : ${customerHeader}</div>
        <style>
            .tally-table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; }
            .tally-table th, .tally-table td { padding: 8px 6px; border: none; border-bottom: 1px solid #ddd; text-align: left; }
            .tally-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background: transparent !important; color: black !important; }
            .tally-table tfoot th { border-top: 1px solid #000; border-bottom: 1px solid #000; color: black !important; }
            .tally-table th:nth-child(1), .tally-table td:nth-child(1) { width: 12%; }
            .tally-table th:nth-child(2), .tally-table td:nth-child(2) { width: 40%; }
            .tally-table th:nth-child(3), .tally-table td:nth-child(3) { width: 16%; text-align: right; }
            .tally-table th:nth-child(4), .tally-table td:nth-child(4) { width: 16%; text-align: right; }
            .tally-table th:nth-child(5), .tally-table td:nth-child(5) { width: 16%; text-align: right; }
            .tally-table .fund-col { text-align: right; }
            .text-end { text-align: right !important; }
            .text-success { color: #198754 !important; }
            .text-warning { color: #d39e00 !important; }
            .fw-bold { font-weight: bold !important; }
        </style>
        <table class="tally-table">
            ${tableEl.innerHTML}
        </table>
    `;
    generatePrint('Ledger', html);
}

function downloadLedgerPDF() {
    const tableEl = document.getElementById('ledgerTable');
    const customerHeader = document.getElementById('ledgerCustomerName').textContent;
    const dateRange = document.getElementById('ledgerDateFilter').value !== 'ALL' 
        ? `${document.getElementById('ledgerStartDate').value} - ${document.getElementById('ledgerEndDate').value}` 
        : 'All Time';

    const titleHtml = `<h2 style="margin: 0; font-size: 20px; font-weight: bold;">LEDGER</h2><div style="font-size: 12px; margin-top: 5px;">${dateRange}</div>`;
    const contentHtml = `<div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">A/c of : ${customerHeader}</div><table class="tally-table">${tableEl.innerHTML}</table>`;
    
    generatePDF(titleHtml, contentHtml, `Ledger_${customerHeader.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, 'portrait');
};


// ---------------- USERS (ADMIN) ----------------
let allUsers = [];
async function loadUsers() {
    const res = await fetch('/api/users');
    allUsers = await res.json();
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    allUsers.forEach(u => {
        tbody.innerHTML += `<tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-user" data-id="${u.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-user" data-id="${u.id}">Delete</button>
            </td>
        </tr>`;
    });
    document.querySelectorAll('.edit-user').forEach(b => b.addEventListener('click', e => editUser(e.target.dataset.id)));
    document.querySelectorAll('.delete-user').forEach(b => b.addEventListener('click', e => deleteEntry(e.target.dataset.id, 'user')));
}

document.getElementById('addUserBtn').addEventListener('click', () => {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
});

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const id = data.id;
    if (!data.password) delete data.password;
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/users/${id}` : '/api/users';
    
    const res = await fetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
    if (res.ok) {
        showNotification('User saved');
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        loadUsers();
    } else {
        showNotification(await res.text(), 'danger');
    }
});

function editUser(id) {
    const u = allUsers.find(x => x.id == id);
    if (!u) return;
    document.getElementById('userId').value = u.id;
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userRole').value = u.role;
    document.getElementById('userPassword').value = '';
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

// ---------------- SALESMEN (ADMIN) ----------------
async function loadSalesmenGrid() {
    const res = await fetch('/api/salesmen');
    allSalesmen = await res.json();
    const tbody = document.getElementById('salesmenTableBody');
    tbody.innerHTML = '';
    allSalesmen.forEach(s => {
        tbody.innerHTML += `<tr>
            <td>${s.id}</td>
            <td>${s.name}</td>
            <td>${s.status}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-salesman" data-id="${s.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-salesman" data-id="${s.id}">Delete</button>
            </td>
        </tr>`;
    });
    document.querySelectorAll('.edit-salesman').forEach(b => b.addEventListener('click', e => editSalesman(e.target.dataset.id)));
    document.querySelectorAll('.delete-salesman').forEach(b => b.addEventListener('click', e => deleteEntry(e.target.dataset.id, 'salesman')));
}

document.getElementById('addSalesmanBtn').addEventListener('click', () => {
    document.getElementById('salesmanForm').reset();
    document.getElementById('salesmanIdModal').value = '';
});

document.getElementById('salesmanForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.status = document.getElementById('salesmanActive').checked ? 'Active' : 'Inactive';
    const id = data.id;
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/salesmen/${id}` : '/api/salesmen';
    
    const res = await fetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
    if (res.ok) {
        showNotification('Salesman saved');
        bootstrap.Modal.getInstance(document.getElementById('salesmanModal')).hide();
        loadSalesmenGrid();
        loadSalesmenDropdowns();
    } else {
        showNotification(await res.text(), 'danger');
    }
});

function editSalesman(id) {
    const s = allSalesmen.find(x => x.id == id);
    if (!s) return;
    document.getElementById('salesmanIdModal').value = s.id;
    document.getElementById('salesmanName').value = s.name;
    document.getElementById('salesmanActive').checked = (s.status === 'Active');
    new bootstrap.Modal(document.getElementById('salesmanModal')).show();
}

// ---------------- REPORTS ----------------
let cityChartInstance = null;
let customerChartInstance = null;
async function loadReports() {
    const filter = new URLSearchParams();
    filter.append('size', '5000'); // Fetch up to 5000 records for reporting
    const salesRes = await fetch(`/api/sales?${filter.toString()}`);
    const data = await salesRes.json();
    
    const cityMap = {};
    const customerMap = {};
    
    data.content.forEach(r => {
        const city = r.city || 'Unknown';
        cityMap[city] = (cityMap[city] || 0) + r.netAmount;
        customerMap[r.customerName] = (customerMap[r.customerName] || 0) + r.netAmount;
    });
    
    const sortedCustomers = Object.entries(customerMap).sort((a,b) => b[1]-a[1]).slice(0,10);
    
    if(cityChartInstance) cityChartInstance.destroy();
    if(customerChartInstance) customerChartInstance.destroy();
    
    const ctx1 = document.getElementById('cityChart').getContext('2d');
    cityChartInstance = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: Object.keys(cityMap),
            datasets: [{ data: Object.values(cityMap), backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0'] }]
        }
    });
    
    const ctx2 = document.getElementById('customerChart').getContext('2d');
    customerChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: sortedCustomers.map(x=>x[0]),
            datasets: [{ label: `Sales (${appSettings.currencySymbol})`, data: sortedCustomers.map(x=>x[1]), backgroundColor: '#36a2eb' }]
        }
    });
}

// ---------------- SYSTEM & PASSWORDS ----------------
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldP = document.getElementById('oldPassword').value;
    const newP = document.getElementById('newPassword').value;
    const confP = document.getElementById('confirmPassword').value;
    
    if(newP !== confP) { return showNotification("Passwords don't match", 'danger'); }
    
    const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `oldPassword=${encodeURIComponent(oldP)}&newPassword=${encodeURIComponent(newP)}`
    });
    
    if(res.ok) {
        showNotification('Password updated successfully');
        bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
        e.target.reset();
    } else {
        showNotification(await res.text(), 'danger');
    }
});

document.getElementById('restoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('restoreFile');
    if (fileInput.files.length === 0) return alert('Select file');
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    const res = await fetch('/api/system/restore', { method: 'POST', body: formData });
    const data = await res.json();
    alert(data.message);
});

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        alert('Settings updated! Please refresh the page to apply all changes.');
    } else {
        alert('Failed to update settings');
    }
});

// ---------------- ERROR LOGS ----------------
async function loadErrorLogs() {
    try {
        const res = await fetch('/api/logs/error');
        if (!res.ok) return;
        const logs = await res.json();
        const tbody = document.querySelector('#errorLogsTable tbody');
        tbody.innerHTML = '';
        logs.forEach(l => {
            tbody.innerHTML += `<tr>
                <td>${new Date(l.timestamp).toLocaleString()}</td>
                <td>${escapeHTML(l.errorMessage)}</td>
                <td>${escapeHTML(l.pageUrl)}</td>
                <td>${escapeHTML(l.actionDetails)}</td>
                <td><pre style="max-height: 100px; font-size: 10px;">${escapeHTML(l.stackTrace)}</pre></td>
            </tr>`;
        });
    } catch(e) { showNotification('Failed to load logs', 'danger'); }
}

// ---------------- CALLING MANAGER ----------------
async function loadCallingData() {
    try {
        const filters = new URLSearchParams(new FormData(document.getElementById('filterForm')));
        
        if (document.getElementById('callingShowAllCustomers') && document.getElementById('callingShowAllCustomers').checked) {
            filters.append('allCustomers', 'true');
        }
        
        const res = await fetch(`/api/calling/customers?${filters.toString()}`);
        const customers = await res.json();
        const tbody = document.querySelector('#callingTable tbody');
        tbody.innerHTML = '';
        customers.forEach(c => {
            let statusBadge = c.callStatus ? `<span class="badge bg-secondary">${c.callStatus}</span>` : '<span class="badge bg-warning text-dark">Pending</span>';
            if (c.callStatus === 'Attended') statusBadge = `<span class="badge bg-success">Attended</span>`;
            if (c.callStatus === 'Not Attended') statusBadge = `<span class="badge bg-danger">Not Attended</span>`;
            
            let remarksText = c.remarks ? escapeHTML(c.remarks) : '';
            let reasonText = c.reason ? escapeHTML(c.reason) : '';
            let combinedRemarks = '';
            if (reasonText && remarksText) combinedRemarks = `<strong>${reasonText}</strong><br>${remarksText}`;
            else if (reasonText) combinedRemarks = `<strong>${reasonText}</strong>`;
            else if (remarksText) combinedRemarks = remarksText;
            else combinedRemarks = '-';

            tbody.innerHTML += `<tr>
                <td class="fw-bold">${escapeHTML(c.customerName)}</td>
                <td>${escapeHTML(c.contactNumber)}</td>
                <td>${c.lastCallDate ? new Date(c.lastCallDate).toLocaleString() : '-'}</td>
                <td>${c.nextCallDate ? c.nextCallDate : '-'}</td>
                <td>${statusBadge}</td>
                <td>${combinedRemarks}</td>
                <td>
                    <button class="btn btn-sm btn-primary log-call-btn" data-name="${escapeHTML(c.customerName)}" data-phone="${escapeHTML(c.contactNumber)}">Log Call</button>
                    <button class="btn btn-sm btn-danger ms-1 raise-ticket-btn" data-name="${escapeHTML(c.customerName)}" data-phone="${escapeHTML(c.contactNumber)}" data-reason="${escapeHTML(c.reason || '')}" data-remarks="${escapeHTML(c.remarks || '')}">Raise Ticket</button>
                </td>
            </tr>`;
        });

        document.querySelectorAll('.log-call-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('logCallForm').reset();
                document.getElementById('callCustomerName').value = btn.dataset.name;
                document.getElementById('callContactNumber').value = btn.dataset.phone;
                new bootstrap.Modal(document.getElementById('logCallModal')).show();
            });
        });

        document.querySelectorAll('.raise-ticket-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(!confirm(`Are you sure you want to raise a Support Ticket for ${btn.dataset.name}?`)) return;
                try {
                    const res = await fetch('/api/tickets/raise', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            customerName: btn.dataset.name,
                            contactNumber: btn.dataset.phone,
                            reason: btn.dataset.reason,
                            remarks: btn.dataset.remarks
                        })
                    });
                    if (res.ok) {
                        alert('Support ticket raised successfully!');
                        updateSupportTicketBadge();
                    } else {
                        alert('Failed to raise ticket.');
                    }
                } catch(e) { console.error(e); }
            });
        });
    } catch (e) {
        console.error('Failed to load calling data', e);
    }
}

document.getElementById('logCallForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.nextCallDate) data.nextCallDate = null;
    if (data.callOutcome !== 'Not Satisfied') data.callReason = null; // Clear reason if not satisfied

    const res = await fetch('/api/calling/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerName: data.customerName,
            contactNumber: data.contactNumber,
            callStatus: data.callStatus,
            callOutcome: data.callOutcome,
            nextCallDate: data.nextCallDate,
            remarks: data.remarks,
            reason: data.callReason
        })
    });

    if (res.ok) {
        showNotification('Call logged successfully');
        bootstrap.Modal.getInstance(document.getElementById('logCallModal')).hide();
        loadCallingData();
        loadCallingReports();
    } else {
        showNotification('Error logging call', 'danger');
    }
});


async function loadCallingReports() {
    try {
        const formData = new FormData(document.getElementById('callingReportFilterForm'));
        const queryParams = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            if (value) queryParams.append(key, value);
        }

        const res = await fetch(`/api/calling/reports?${queryParams.toString()}`);
        const reports = await res.json();
        
        const tbody = document.querySelector('#callingReportTable tbody');
        tbody.innerHTML = '';
        reports.forEach(r => {
            let statusBadge = r.callStatus === 'Attended' ? `<span class="badge bg-success">${r.callStatus}</span>` : `<span class="badge bg-danger">${r.callStatus || ''}</span>`;
            
            let outcomeBadge = '';
            if (r.callOutcome === 'Satisfied') outcomeBadge = `<span class="badge bg-success">${r.callOutcome}</span>`;
            else if (r.callOutcome === 'Not Satisfied') outcomeBadge = `<span class="badge bg-danger">${r.callOutcome}</span>`;
            else if (r.callOutcome) outcomeBadge = `<span class="badge bg-warning text-dark">${r.callOutcome}</span>`;
            
            tbody.innerHTML += `<tr>
                <td>${r.id}</td>
                <td class="fw-bold">${escapeHTML(r.customerName)}</td>
                <td>${escapeHTML(r.contactNumber)}</td>
                <td>${r.callDate ? new Date(r.callDate).toLocaleString() : '-'}</td>
                <td>${statusBadge}</td>
                <td>${outcomeBadge}</td>
                <td>${r.nextCallDate ? r.nextCallDate : '-'}</td>
                <td>${escapeHTML(r.remarks)}</td>
                <td>${r.calledBy ? r.calledBy.username : '-'}</td>
                <td>
                    ${hasPermission('Calling', 'DELETE') ? `<button class="btn btn-sm btn-danger delete-call-btn" data-id="${r.id}"><i class="bi bi-trash"></i></button>` : ''}
                </td>
            </tr>`;
        });
        document.querySelectorAll('.delete-call-btn').forEach(b => b.addEventListener('click', e => deleteEntry(e.currentTarget.dataset.id, 'callingReport')));
    } catch (e) {
        console.error('Failed to load calling reports', e);
    }
}

document.getElementById('callingReportFilterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadCallingReports();
});

// --- Stock Management Logic ---
let productsList = [];

async function loadStock() {
    try {
        const res = await fetch('/api/products');
        productsList = await res.json();
        const tbody = document.querySelector('#stockTable tbody');
        tbody.innerHTML = '';
        productsList.forEach(p => {
            tbody.innerHTML += `<tr>
                <td>${p.id}</td>
                <td>${p.itemName}</td>
                <td>${p.shortcutKey || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (e) {
        showNotification('Failed to load stock', 'danger');
    }
}

function openProductModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').innerText = 'Add Product';
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      const id = data.id;
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/products/${id}` : '/api/products';
      
      if (!data.sku) data.sku = null; // Prevent unique constraint violations on empty sku
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showNotification('Product saved successfully');
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            loadStock();
        } else {
            showNotification('Failed to save product', 'danger');
        }
    } catch (e) {
        showNotification('Error', 'danger');
    }
});

function editProduct(id) {
    const p = productsList.find(x => x.id === id);
    if (p) {
        document.getElementById('productId').value = p.id;
        document.getElementById('itemName').value = p.itemName;
        document.getElementById('shortcutKey').value = p.shortcutKey || '';
        document.getElementById('sku').value = p.sku;
        document.getElementById('productPrice').value = p.price;
        document.getElementById('stockQuantity').value = p.stockQuantity;
        document.getElementById('productDesc').value = p.description;
        document.getElementById('productModalTitle').innerText = 'Edit Product';
        new bootstrap.Modal(document.getElementById('productModal')).show();
    }
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showNotification('Product deleted');
            loadStock();
        } else {
            showNotification('Failed to delete product', 'danger');
        }
    }
}

// --- Billing Logic ---
let currentBillItems = [];
let currentCustomerCredit = 0;
let currentCashRefundLimit = 0;

async function loadBills() {
    try {
        const res = await fetch('/api/billing');
        const bills = await res.json();
        const tbody = document.querySelector('#billsTable tbody');
        tbody.innerHTML = '';
        bills.forEach(b => {
            tbody.innerHTML += `<tr>
                <td>#INV-${b.id}</td>
                <td>${new Date(b.billDate).toLocaleString()}</td>
                <td>${escapeHTML(b.customerName)}</td>
                <td>${escapeHTML(b.contactNumber)}</td>
                <td>${b.salesman ? b.salesman.name : '-'}</td>
                <td class="fund-col">${appSettings.currencySymbol}${formatCurrency(b.totalAmount)}</td>
                <td class="fund-col">${appSettings.currencySymbol}${formatCurrency(b.discount)}</td>
                <td class="fw-bold fund-col">${appSettings.currencySymbol}${formatCurrency(b.netAmount)}</td>
                <td class="text-success fund-col">${appSettings.currencySymbol}${formatCurrency(b.paidAmount)}</td>
                <td class="text-danger fund-col">${appSettings.currencySymbol}${formatCurrency(b.creditAmount)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick='editBill(${JSON.stringify(b).replace(/'/g, "&apos;")})'><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick='printOldInvoice(${b.id})'><i class="bi bi-printer"></i></button>
                    <button class="btn btn-sm btn-danger" onclick='deleteEntry(${b.id}, "bill")'><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (e) {
        showNotification('Failed to load bills', 'danger');
    }
}


function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const originalFetch = window.fetch;
window.fetch = async function(...args) {
    let [resource, config] = args;
    if (config && (config.method === 'POST' || config.method === 'PUT' || config.method === 'DELETE')) {
        const token = getCookie('XSRF-TOKEN');
        if (token) {
            config.headers = {
                ...config.headers,
                'X-XSRF-TOKEN': token
            };
        }
        args = [resource, config];
    }
    const response = await originalFetch(...args);
    if (response.status === 401 && typeof args[0] === 'string' && !args[0].includes('/api/auth/login') && !args[0].includes('/api/auth/status')) {
        window.location.href = '/index.html';
        return response;
    }
    
    if (!response.ok && typeof args[0] === 'string' && !args[0].includes('/api/auth/status')) {
        try {
            const data = await response.clone().json();
            showNotification(data.message || data.error || 'Request failed', 'danger');
        } catch(e) {
            showNotification(`Error: ${response.status} ${response.statusText}`, 'danger');
        }
    }
    return response;
};

// Roles array based on enum
let editingSalesRecordDate = null;
let editingSalesRecordId = null;
let editingBillId = null;

async function loadProductsAndSalesmenForBill() {
    try {
        const resP = await fetch('/api/products');
        productsList = await resP.json();
        const prodSelect = document.getElementById('billProductSelect');
        prodSelect.innerHTML = '<option value="">Select Product...</option>';
        productsList.forEach(p => {
            const prefix = p.shortcutKey ? ` [${p.shortcutKey}]` : '';
            prodSelect.innerHTML += `<option value="${p.id}" data-shortcut="${p.shortcutKey || ''}">${p.itemName}${prefix}</option>`;
        });
    } catch(e) {}
    
    try {
        const resS = await fetch('/api/salesmen');
        allSalesmen = await resS.json();
        const sSelect = document.getElementById('billSalesman');
        sSelect.innerHTML = '<option value="">Select Salesman...</option>';
        allSalesmen.forEach(s => {
            sSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    } catch(e) {}
}

async function openNewBill(voucherType = 'SALES') {
    editingBillId = null;
    editingSalesRecordId = null;
    currentBillItems = [];
    document.getElementById('billCustomerName').value = '';
    document.getElementById('billContact').value = '';
    document.getElementById('billCity').value = '';
    document.getElementById('billDiscount').value = '0';
    document.getElementById('billHasExpenses').checked = false;
    const isProductReturnEl = document.getElementById('billIsProductReturn');
    if (isProductReturnEl) {
        isProductReturnEl.checked = false;
        const returnTypeContainer = document.getElementById('returnTypeContainer');
        if (returnTypeContainer) returnTypeContainer.style.display = 'none';
        document.getElementById('returnTypeCredit').checked = true;
    }
    document.getElementById('billExpenses').value = '0';
    document.getElementById('billExpenses').classList.add('d-none');
    document.getElementById('billPaidAmount').value = '0';
    currentCustomerCredit = 0;
    
    document.getElementById('typeCash').disabled = false;
    document.getElementById('typeCredit').disabled = false;
    document.getElementById('typeDebit').disabled = false;
    
    document.getElementById('billProductSelect').value = '';
    document.getElementById('billItemPrice').value = '';
    document.getElementById('billItemQty').value = '';
    
    const modalTitle = document.getElementById('voucherModalTitle');
    
    if (voucherType === 'SALES') {
        document.getElementById('typeCredit').checked = true;
        modalTitle.textContent = "Sales Voucher (F8)";
        document.querySelector('#billingModal .modal-header').style.backgroundColor = '#f0f0f0';
    } else if (voucherType === 'RECEIPT') {
        document.getElementById('typeDebit').checked = true;
        modalTitle.textContent = "Receipt Voucher (F6)";
        document.querySelector('#billingModal .modal-header').style.backgroundColor = '#e8e8e8';
    }
    
    toggleEntryTypeMode();
    renderBillItems();

    await loadProductsAndSalesmenForBill();
    const modalEl = document.getElementById('billingModal');
    let bsModal = bootstrap.Modal.getInstance(modalEl);
    if (!bsModal) bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

let shortcutBuffer = '';
let shortcutTimeout = null;

// Global Keyboard Listeners for Tally ERP Workflow
document.addEventListener('keydown', (e) => {
    // Prevent default browser shortcuts if necessary, but carefully
    if (e.key === 'F8') {
        e.preventDefault();
        openNewBill('SALES');
    } else if (e.key === 'F6') {
        e.preventDefault();
        openNewBill('RECEIPT');
    } else if (e.key.toLowerCase() === 's' && e.altKey) {
        // Alt + S to save voucher
        const billingModal = document.getElementById('billingModal');
        if (billingModal && billingModal.classList.contains('show')) {
            e.preventDefault();
            document.getElementById('btnSaveSalesVoucher').click();
        }
    } else if (e.key === 'Tab') {
        const billingModal = document.getElementById('billingModal');
        if (billingModal && billingModal.classList.contains('show')) {
            const focusableElements = billingModal.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])');
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                if (e.shiftKey) { 
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { 
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }
    }
    
    // Product Shortcut Key Selection inside Sales Voucher
    const billingModal = document.getElementById('billingModal');
    if (billingModal && billingModal.classList.contains('show')) {
        // Only trigger if focus is not currently inside an input/textarea (unless it's the product select)
        const activeTag = (document.activeElement.tagName || '').toLowerCase();
        if ((activeTag !== 'input' && activeTag !== 'textarea') || document.activeElement.id === 'billProductSelect') {
            
            // Ignore if key is not a single character
            if (e.key.length !== 1) return;
            
            if(document.activeElement.id === 'billProductSelect') {
                e.preventDefault();
            }
            
            shortcutBuffer += e.key.toLowerCase();
            clearTimeout(shortcutTimeout);
            
            const prodSelect = document.getElementById('billProductSelect');
            if (prodSelect) {
                // Find by exact shortcut first
                let option = Array.from(prodSelect.options).find(opt => opt.dataset.shortcut && opt.dataset.shortcut.toLowerCase() === shortcutBuffer);
                
                // If not found by shortcut, try finding by matching the starting text of itemName
                if (!option) {
                    option = Array.from(prodSelect.options).find(opt => opt.text.toLowerCase().startsWith(shortcutBuffer));
                }
                
                if (option) {
                    prodSelect.value = option.value;
                    document.getElementById('billItemPrice').value = '';
                }
            }
            
            shortcutTimeout = setTimeout(() => {
                shortcutBuffer = '';
            }, 500);
        }
    }
});

async function editBill(bill) {
    editingBillId = bill.id;
    editingSalesRecordId = null;
    currentBillItems = [];
    document.getElementById('billProductSelect').value = '';
    document.getElementById('billItemPrice').value = '';
    document.getElementById('billItemQty').value = '';
    
    document.getElementById('billCustomerName').value = bill.customerName;
    document.getElementById('billContact').value = bill.contactNumber;
    document.getElementById('billCity').value = bill.city;
    document.getElementById('billDiscount').value = bill.discount;
    if (bill.expenses && bill.expenses > 0) {
        document.getElementById('billHasExpenses').checked = true;
        document.getElementById('billExpenses').value = bill.expenses;
        document.getElementById('billExpenses').classList.remove('d-none');
    } else {
        document.getElementById('billHasExpenses').checked = false;
        document.getElementById('billExpenses').value = '0';
        document.getElementById('billExpenses').classList.add('d-none');
    }
    document.getElementById('billPaidAmount').value = bill.paidAmount;
    
    // Attempt to fetch current credit just like selecting a customer
    try {
        const res = await fetch(`/api/sales/customer/credit?customerName=${encodeURIComponent(bill.customerName)}&contact=${bill.contactNumber}`);
        currentCustomerCredit = parseCurrency(await res.text()) || 0;
    } catch(e) {
        currentCustomerCredit = bill.creditAmount;
    }

    if (bill.creditAmount > 0) {
        document.getElementById('typeCredit').checked = true;
    } else {
        document.getElementById('typeCash').checked = true;
    }
    
    document.getElementById('typeCash').disabled = false;
    document.getElementById('typeCredit').disabled = false;
    document.getElementById('typeDebit').disabled = true; // Can't change to debit if editing a bill
    
    toggleEntryTypeMode();
    
    if (bill.items) {
        bill.items.forEach(item => {
            currentBillItems.push({
                productId: item.product.id,
                itemName: item.product.itemName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            });
        });
    }
    renderBillItems();
    
    await loadProductsAndSalesmenForBill();
    if (bill.salesman) {
        document.getElementById('billSalesman').value = bill.salesman.id;
    }
    
    new bootstrap.Modal(document.getElementById('billingModal')).show();
}


document.getElementById('billProductSelect').addEventListener('change', (e) => {
    document.getElementById('billItemPrice').value = '';
});

document.getElementById('billProductSelect').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('billItemPrice').focus();
    }
});

document.getElementById('billItemPrice').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('billItemQty').focus();
    }
});

document.getElementById('billItemQty').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnAddItem').click();
    }
});

document.getElementById('btnAddItem').addEventListener('click', () => {
    const prodSelect = document.getElementById('billProductSelect');
    const pid = prodSelect.value;
    if (!pid) return showNotification('Select a product', 'warning');
    
    const qty = parseCurrency(document.getElementById('billItemQty').value) || 1;
    const price = parseCurrency(document.getElementById('billItemPrice').value) || 0;
    
    if (qty <= 0) return;
    if (price <= 0) return showNotification('Please enter a valid price', 'warning');

    const existing = currentBillItems.find(x => x.productId == pid && x.unitPrice === price);
    if (existing) {
        existing.quantity += qty;
        existing.totalPrice = existing.quantity * existing.unitPrice;
    } else {
        currentBillItems.push({
            productId: pid,
            itemName: prodSelect.options[prodSelect.selectedIndex].text,
            quantity: qty,
            unitPrice: price,
            totalPrice: qty * price
        });
    }
    
    document.getElementById('billProductSelect').value = '';
    document.getElementById('billItemPrice').value = '';
    document.getElementById('billItemQty').value = '';
    
    renderBillItems();
    
    // Automatically focus back to Product Select so user doesn't even need to press backtick manually
    document.getElementById('billProductSelect').focus();
});

function renderBillItems() {
    const tbody = document.querySelector('#billItemsTable tbody');
    tbody.innerHTML = '';
    let total = 0;
    currentBillItems.forEach((item, index) => {
        total += item.totalPrice;
        tbody.innerHTML += `<tr>
            <td>${index + 1}</td>
            <td>${item.itemName}</td>
            <td>${appSettings.currencySymbol}${formatCurrency(item.unitPrice)}</td>
            <td>${item.quantity}</td>
            <td>${appSettings.currencySymbol}${formatCurrency(item.totalPrice)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="removeBillItem(${index})"><i class="bi bi-x"></i></button></td>
        </tr>`;
    });
    
    document.getElementById('billTotalAmount').innerText = formatCurrency(total);
    calculateBill();
}

function removeBillItem(index) {
    currentBillItems.splice(index, 1);
    renderBillItems();  
}

function calculateBill() {
    const total = parseCurrency(document.getElementById('billTotalAmount').innerText) || 0;
    const discountPerUnit = parseCurrency(document.getElementById('billDiscount').value) || 0;
    const hasExpenses = document.getElementById('billHasExpenses').checked;
    const expenses = hasExpenses ? (parseCurrency(document.getElementById('billExpenses').value) || 0) : 0;
    let totalQty = 0;
    currentBillItems.forEach(item => totalQty += item.quantity);
    const totalDiscount = totalQty * discountPerUnit;
    const net = total - totalDiscount + expenses;
    
    const discTotalEl = document.getElementById('billDiscountTotal');
    if (discTotalEl) {
        if (totalDiscount > 0) discTotalEl.innerText = `(${appSettings.currencySymbol}${formatCurrency(totalDiscount)})`;
        else discTotalEl.innerText = '';
    }
    
    document.getElementById('billNetAmount').innerText = formatCurrency(net);
      
      const paidAmountInput = document.getElementById('billPaidAmount');
      const entryType = document.querySelector('input[name="entryType"]:checked').value;
      
      if (entryType === 'CASH') {
          paidAmountInput.value = formatCurrency(net);
          paidAmountInput.readOnly = true;
      } else {
          paidAmountInput.readOnly = false;
      }
      
      const paid = parseCurrency(paidAmountInput.value) || 0;

      if (entryType === 'DEBIT') {
          let credit = currentCustomerCredit - paid;
          
          const isProductReturnCheckbox = document.getElementById('billIsProductReturn');
          if (isProductReturnCheckbox && isProductReturnCheckbox.checked) {
              const checkedRadio = document.querySelector('input[name="returnType"]:checked');
              if (checkedRadio && checkedRadio.value === 'CASH') {
                  credit = currentCustomerCredit; // Cash return doesn't affect Udhar
              }
          }
          
          document.getElementById('billCreditAmount').innerText = formatCurrency(credit);
          
          // Optionally show total pending in label for clarity
          document.getElementById('creditPendingRow').firstElementChild.innerText = "Total Credit Pending:";
      } else {
          const credit = (net - paid);
          document.getElementById('billCreditAmount').innerText = formatCurrency(credit);
          
          document.getElementById('creditPendingRow').firstElementChild.innerText = "Credit Pending (This Bill):";
      }
  }

document.getElementById('billDiscount').addEventListener('input', calculateBill);
document.getElementById('billHasExpenses').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('billExpenses').classList.remove('d-none');
    else document.getElementById('billExpenses').classList.add('d-none');
    calculateBill();
});
document.getElementById('billExpenses').addEventListener('input', calculateBill);
document.getElementById('billPaidAmount').addEventListener('input', calculateBill);

document.querySelectorAll('input[name="returnType"]').forEach(radio => {
    radio.addEventListener('change', calculateBill);
});
document.getElementById('billIsProductReturn').addEventListener('change', calculateBill);


document.querySelectorAll('input[name="entryType"]').forEach(radio => {
    radio.addEventListener('change', toggleEntryTypeMode);
});

const isProductReturnEl = document.getElementById('billIsProductReturn');
if (isProductReturnEl) {
    isProductReturnEl.addEventListener('change', function() {
        const returnTypeContainer = document.getElementById('returnTypeContainer');
        if (returnTypeContainer) {
            returnTypeContainer.style.display = this.checked ? 'block' : 'none';
        }
    });
}

document.getElementById('billCustomerName').addEventListener('input', () => {
    if(document.querySelector('input[name="entryType"]:checked').value === 'DEBIT') toggleEntryTypeMode();
});
document.getElementById('billContact').addEventListener('input', () => {
    if(document.querySelector('input[name="entryType"]:checked').value === 'DEBIT') toggleEntryTypeMode();
});

async function toggleEntryTypeMode() {
    const entryType = document.querySelector('input[name="entryType"]:checked').value;
    const itemsSection = document.getElementById('addItemsSection');
    const netPayableRow = document.getElementById('netPayableRow');
    const summaryHr = document.getElementById('summaryHr');
    const paidLabel = document.getElementById('paidAmountLabel');
    const creditPendingRow = document.getElementById('creditPendingRow');
    const btnSaveBill = document.getElementById('btnSaveBill');
    const totalAmountRow = document.getElementById('billTotalAmount').parentElement;
    const discountRow = document.getElementById('billDiscount').parentElement;
    const expensesContainer = document.getElementById('expensesContainer');
    const productReturnContainer = document.getElementById('productReturnContainer');

    if (entryType === 'DEBIT') {
        itemsSection.style.display = 'none';
        netPayableRow.style.display = 'none';
        summaryHr.style.display = 'none';
        totalAmountRow.style.display = 'none';
        discountRow.style.display = 'none';
        if (expensesContainer) expensesContainer.style.display = 'none';
        if (productReturnContainer) productReturnContainer.style.display = 'block';
        creditPendingRow.style.display = 'flex'; // Show bakaya
        paidLabel.innerText = 'Amount Received *';
        btnSaveBill.innerText = 'Save Receipt (Alt+S)';
        document.getElementById('billPaidAmount').readOnly = false;
        
        // Auto-fetch bakaya if contact or name is selected
        const contact = document.getElementById('billContact').value.trim();
        const customerName = document.getElementById('billCustomerName').value.trim();
        if(customerName) {
            try {
                const queryParams = new URLSearchParams({ customerName: customerName, contact: contact });
                const res = await fetch(`/api/sales/customer/credit?${queryParams.toString()}`);
                currentCustomerCredit = parseCurrency(await res.text()) || 0;
                
                const refundRes = await fetch(`/api/sales/customer/available-cash-refund?${queryParams.toString()}`);
                const refundData = await refundRes.json();
                currentCashRefundLimit = parseFloat(refundData.availableAmount) || 0;
                
                const creditRefundRes = await fetch(`/api/sales/customer/available-credit-refund?${queryParams.toString()}`);
                const creditRefundData = await creditRefundRes.json();
                const availableCreditAmount = parseFloat(creditRefundData.availableAmount) || 0;
                
                const limitText = document.getElementById('cashRefundLimitText');
                if(limitText) {
                    limitText.innerHTML = `(Available: ${formatCurrency(currentCashRefundLimit)} from ${refundData.cashBillsCount} Cash Bills)`;
                }
                const creditLimitText = document.getElementById('creditRefundLimitText');
                if(creditLimitText) {
                    creditLimitText.innerHTML = `(Available: ${formatCurrency(availableCreditAmount)} from ${creditRefundData.creditBillsCount} Credit Bills)`;
                }
            } catch(e) {
                currentCustomerCredit = 0;
                currentCashRefundLimit = 0;
            }
        } else {
            currentCustomerCredit = 0;
            currentCashRefundLimit = 0;
        }
        if (typeof calculateBill === 'function') calculateBill();
    } else {
        itemsSection.style.display = 'block';
        netPayableRow.style.display = 'flex';
        summaryHr.style.display = 'block';
        totalAmountRow.style.display = 'flex';
        discountRow.style.display = 'block';
        if (expensesContainer) expensesContainer.style.display = 'block';
        if (productReturnContainer) productReturnContainer.style.display = 'none';
        creditPendingRow.style.display = 'flex';
        paidLabel.innerText = 'Paid Amount *';
        btnSaveBill.innerText = 'Save Sales Voucher (Alt+S)';
        calculateBill();
    }
}

document.getElementById('btnSaveBill').addEventListener('click', async () => {
    const entryType = document.querySelector('input[name="entryType"]:checked').value;
    
    if (entryType !== 'DEBIT' && currentBillItems.length === 0) {
        return showNotification('Add at least one item', 'warning');
    }
    
    if (entryType === 'DEBIT') {
        const isProductReturn = document.getElementById('billIsProductReturn').checked;
        const currentReturnType = document.querySelector('input[name="returnType"]:checked') ? document.querySelector('input[name="returnType"]:checked').value : 'CREDIT';
        const paymentAmount = parseCurrency(document.getElementById('billPaidAmount').value);
        
        if (isProductReturn && currentReturnType === 'CASH') {
            if (paymentAmount > currentCashRefundLimit) {
                return showNotification(`Amount exceeds available cash refund limit of ${formatCurrency(currentCashRefundLimit)}`, 'danger');
            }
        } else if (isProductReturn && currentReturnType === 'CREDIT') {
            if (paymentAmount > currentCustomerCredit) {
                return showNotification(`Credit Return amount cannot exceed pending balance of ${formatCurrency(currentCustomerCredit)}`, 'danger');
            }
        }

        const isProductReturnCheckbox = document.getElementById('billIsProductReturn');
        let returnType = "CREDIT";
        let isReturn = false;
        if (isProductReturnCheckbox && isProductReturnCheckbox.checked) {
            isReturn = true;
            const checkedRadio = document.querySelector('input[name="returnType"]:checked');
            if (checkedRadio) returnType = checkedRadio.value;
        }
        
        let remarks = "Payment Received via unified entry";
        if (isReturn) {
            if (returnType === 'CASH') {
                remarks = "Payment Refund Via Cash Entry";
            }
        }
        
        const payload = {
            customerName: document.getElementById('billCustomerName').value,
            contactNumber: document.getElementById('billContact').value,
            paymentAmount: parseCurrency(document.getElementById('billPaidAmount').value) || 0,
            remarks: remarks,
            city: document.getElementById('billCity').value,
            isProductReturn: isReturn,
            returnType: returnType
        };
        
        if (!payload.customerName || !payload.contactNumber) {
            return showNotification('Customer Name and Contact are required', 'danger');
        }
        if (payload.paymentAmount <= 0) {
            return showNotification('Please enter a valid amount', 'warning');
        }

        try {
            const method = editingSalesRecordId ? 'PUT' : 'POST';
            let url = '/api/sales/payment';
            if (editingSalesRecordId) {
                // When editing a payment, we use the generic /api/sales/{id} endpoint
                url = `/api/sales/${editingSalesRecordId}`;
                // Adapt payload for SalesRecord
                payload.entryDate = editingSalesRecordDate || getLocalDateString();
                payload.billAmount = 0;
                payload.discount = 0;
                payload.netAmount = 0;
                payload.quantity = 0;
                payload.creditAmount = -payload.paymentAmount;
                payload.billType = "PAYMENT_RECEIVED";
                payload.city = document.getElementById('billCity').value;
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showNotification('Payment saved successfully!');
                bootstrap.Modal.getInstance(document.getElementById('billingModal')).hide();
                if (typeof loadUniqueCustomersTable === 'function') loadUniqueCustomersTable();
                if (typeof loadUniqueCustomers === 'function') loadUniqueCustomers();
                if (typeof loadBills === 'function') loadBills();
                if (typeof loadEntries === 'function') loadEntries();
                if (typeof loadDashboard === 'function') loadDashboard();
            } else {
                showNotification('Failed to process payment', 'danger');
            }
        } catch (e) {
            showNotification('Error processing payment', 'danger');
        }
        return;
    }
    
    const payload = {
        customerName: document.getElementById('billCustomerName').value,
        contactNumber: document.getElementById('billContact').value,
        city: document.getElementById('billCity').value,
        salesmanId: document.getElementById('billSalesman').value || null,
        totalAmount: parseCurrency(document.getElementById('billTotalAmount').innerText),
        discount: parseCurrency(document.getElementById('billDiscount').value) || 0,
        expenses: document.getElementById('billHasExpenses').checked ? (parseCurrency(document.getElementById('billExpenses').value) || 0) : 0,
        netAmount: parseCurrency(document.getElementById('billNetAmount').innerText),
        paidAmount: parseCurrency(document.getElementById('billPaidAmount').value) || 0,
        items: currentBillItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice
        }))
    };
    
    if (!payload.customerName || !payload.contactNumber) {
        return showNotification('Customer Name and Contact are required', 'danger');
    }

    try {
        const method = editingBillId ? 'PUT' : 'POST';
        const url = editingBillId ? `/api/billing/${editingBillId}` : '/api/billing';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const savedBill = await res.json();
            showNotification(editingBillId ? 'Bill updated successfully!' : 'Bill created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('billingModal')).hide();
            if (!editingBillId) {
                printInvoice(savedBill, currentBillItems);
            }
            loadBills();
            if (typeof loadEntries === 'function') loadEntries();
            if (typeof loadDashboard === 'function') loadDashboard();
            if (typeof loadUniqueCustomersTable === 'function') loadUniqueCustomersTable();
            if (typeof loadUniqueCustomers === 'function') loadUniqueCustomers();
        } else {
            const err = await res.text();
            showNotification('Failed: ' + err, 'danger');
        }
    } catch (e) {
        showNotification('Error saving bill', 'danger');
    }
});

async function printOldInvoice(bill) {
    let billId = (typeof bill === 'object') ? bill.id : bill;
    try {
        const res = await fetch(`/api/billing/${billId}`);
        if (res.ok) {
            const fetchedBill = await res.json();
            printInvoice(fetchedBill, fetchedBill.items || []);
        } else {
            showNotification('Could not find bill details.', 'warning');
        }
    } catch(e) {
        showNotification('Error fetching bill details', 'danger');
    }
}

function printInvoice(bill, itemsDetails, prefix = "INV-") {
    document.getElementById('invBusinessName').innerText = appSettings.companyName || "My Company";
    document.getElementById('invCustomerName').innerText = bill.customerName;
    document.getElementById('invCustomerContact').innerText = bill.contactNumber;
    document.getElementById('invCustomerCity').innerText = bill.city || '';
    
    document.getElementById('invDate').innerText = new Date(bill.billDate).toLocaleDateString();
    document.getElementById('invNumber').innerText = prefix + bill.id;
    
    // Fill Print Settings
    document.getElementById('invTerms').innerText = appSettings.printTermsConditions || '';
    document.getElementById('invBankDetails').innerText = appSettings.printBankDetails || '';
    document.getElementById('invSignatory').innerText = appSettings.printSignatory || 'Authorized Signatory';
    
    // Handle Paper Size
    const printArea = document.getElementById('invoicePrintArea');
    if (appSettings.printPaperSize === '80mm') {
        printArea.style.maxWidth = '80mm';
        printArea.style.fontSize = '0.8rem';
    } else if (appSettings.printPaperSize === 'A5') {
        printArea.style.maxWidth = '148mm';
        printArea.style.fontSize = '0.9rem';
    } else {
        printArea.style.maxWidth = '800px';
        printArea.style.fontSize = '1rem';
    }
    
    // Find salesman name if object exists
    let salesmanName = '-';
    if (bill.salesman) salesmanName = bill.salesman.name;
    else if (bill.salesmanId) {
        const s = allSalesmen.find(x => x.id == bill.salesmanId);
        if (s) salesmanName = s.name;
    }
    document.getElementById('invSalesman').innerText = salesmanName;

    const tbody = document.getElementById('invItemsTable');
    tbody.innerHTML = '';
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

    document.getElementById('invSubtotal').innerText = appSettings.currencySymbol + formatCurrency(bill.totalAmount);
    
    let totalQty = 0;
    itemsDetails.forEach(item => totalQty += item.quantity);
    let totalDiscount = bill.discount * totalQty;
    
    document.getElementById('invDiscount').innerText = appSettings.currencySymbol + formatCurrency(totalDiscount);
    
    if (bill.expenses && bill.expenses > 0) {
        document.getElementById('invExpensesRow').classList.remove('d-none');
        document.getElementById('invExpenses').innerText = appSettings.currencySymbol + formatCurrency(bill.expenses);
    } else {
        document.getElementById('invExpensesRow').classList.add('d-none');
    }
    
    document.getElementById('invNetTotal').innerText = appSettings.currencySymbol + formatCurrency(bill.netAmount);
    document.getElementById('invPaid').innerText = appSettings.currencySymbol + formatCurrency(bill.paidAmount);
    document.getElementById('invCredit').innerText = appSettings.currencySymbol + formatCurrency(bill.creditAmount);
    
    let printFrame = document.getElementById('globalPrintFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'globalPrintFrame';
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
    }
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write('<html><head><title>Print Invoice</title>');
    doc.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">');
    doc.write('<link href="/assets/css/style.css" rel="stylesheet">');
    doc.write('<style>body { background: white !important; color: black !important; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; }</style>');
    doc.write('</head><body style="padding: 20px;">');
    doc.write('<div style="max-width: ' + printArea.style.maxWidth + '; margin: 0 auto; font-size: ' + printArea.style.fontSize + ';">');
    doc.write(document.getElementById('invoicePrintArea').innerHTML);
    doc.write('</div></body></html>');
    doc.close();

    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
    }, 500);
}

async function printReceipt(record) {
    let isPayment = (record.billType === 'PAYMENT_RECEIVED' || (record.netAmount === 0 && record.creditAmount < 0));
    let isReturn = (record.billType === 'PRODUCT_RETURN' || record.billType === 'CASH_RETURN' || record.netAmount < 0);
    let isDebit = (!isPayment && !isReturn && record.netAmount > 0);
    let isCashReturn = (record.billType === 'CASH_RETURN');
    
    let typeLabel = isReturn ? (isCashReturn ? "CASH REFUND" : "PRODUCT RETURN") : (isPayment ? "RECEIVED PAYMENT" : "DEBIT VOUCHER");
    let isCustomerCredit = isPayment || (isReturn && !isCashReturn);
    let amountLabel = isCustomerCredit ? "Credit" : (isCashReturn ? "Refund" : "Debit");
    
    let txnAmount = isPayment ? Math.abs(record.creditAmount) : Math.abs(record.netAmount);
    
    // Retrieve city from nested customer or direct property
    let city = "-";
    if (record.customer && record.customer.city) {
        city = record.customer.city;
    } else if (record.city) {
        city = record.city;
    }

    let currentCredit = 0;
    try {
        const queryParams = new URLSearchParams({ customerName: record.customerName, contact: record.contactNumber || '' });
        if (record.id) {
            queryParams.append('upToId', record.id);
        }
        const res = await fetch(`/api/sales/customer/credit?${queryParams.toString()}`);
        if(res.ok) {
            currentCredit = parseFloat(await res.text()) || 0;
        }
    } catch(e) {
        console.error("Could not fetch current credit for receipt", e);
    }
    
    let previousCredit = isCustomerCredit ? (currentCredit + txnAmount) : (isCashReturn ? currentCredit : (currentCredit - txnAmount));
    
    let calculationString = isCashReturn 
        ? `${amountLabel}: ${formatCurrency(txnAmount)}`
        : `Balance: ${formatCurrency(previousCredit)} DR &nbsp;&nbsp;&nbsp; ${amountLabel}: ${formatCurrency(txnAmount)} &nbsp;&nbsp;&nbsp; Closing Balance: ${formatCurrency(currentCredit)} DR`;

    let htmlContent = `
    <html>
    <head>
        <title>Print Receipt</title>
        <style>
            body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: white; color: black; padding: 20px; margin: 0; }
            .receipt-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
            .text-center { text-align: center; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .details-table th, .details-table td { padding: 10px; border: 1px solid #000; text-align: left; }
            .details-table th { background-color: #f0f0f0; }
            .calc-line { font-weight: bold; font-size: 14px; margin-top: 15px; text-align: right; border: 1px solid #000; padding: 10px; background-color: #f9f9f9; }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header text-center">
                <h2>${appSettings.companyName || 'My Company'}</h2>
                <h3>${typeLabel}</h3>
                <p><strong>Receipt No:</strong> ${(isReturn ? 'RET-' : 'REC-') + record.id} &nbsp;&nbsp; <strong>Date:</strong> ${new Date(record.entryDate).toLocaleDateString()}</p>
            </div>
            
            <table class="details-table">
                <tr>
                    <th>CUSTOMER NAME</th>
                    <th>CONTACT NUMBER</th>
                    <th>CITY</th>
                    <th>REMARKS</th>
                </tr>
                <tr>
                    <td>${record.customerName}</td>
                    <td>${record.contactNumber || '-'}</td>
                    <td>${city}</td>
                    <td>${record.remarks || '-'}</td>
                </tr>
            </table>
            
            <div class="calc-line">
                ${calculationString}
            </div>
            
            <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                <div><br>_________________________<br>Customer Signature</div>
                <div><br>_________________________<br>Authorized Signatory</div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    let printFrame = document.getElementById('globalPrintFrame');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'globalPrintFrame';
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);
    }
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    
    setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
    }, 500);
}

// Role Permissions Matrix
matrixRoles = ['DATA_ENTRY_MANAGER', 'CALLING_MANAGER', 'ACCOUNT_MANAGER'];
const matrixModules = ['Dashboard', 'Calling Dashboard', 'Calling List', 'Calling Reports', 'Sales Entries', 'Customers', 'Stock Management', 'Accounting Vouchers', 'Reports', 'Users', 'Salesmen', 'Settings', 'Support Ticket', 'System Logs'];

async function loadPermissionsMatrix() {
    try {
        const res = await fetch('/api/permissions');
        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`Failed to load permissions: ${res.status} ${errTxt}`);
        }
        let allPerms = await res.json();
        if (!Array.isArray(allPerms)) allPerms = [];
        
        const container = document.getElementById('permissionsMatrixContainer');
        if(!container) return; // safety
        container.innerHTML = '';
        
        matrixRoles.forEach(role => {
            let roleHtml = `
            <div class="card mb-4 border-secondary">
                <div class="card-header bg-secondary text-white fw-bold">
                    Role: ${role.replace(/_/g, ' ')}
                </div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-bordered table-hover mb-0 text-center permissions-matrix-table">
                        <thead class="table-dark sticky-top">
                            <tr>
                                <th>MODULE</th>
                                <th>VIEW</th>
                                <th>CREATE</th>
                                <th>EDIT</th>
                                <th>DELETE</th>
                                <th>VIEW FUND</th>
                            </tr>
                        </thead>
                        <tbody>`;
            
            matrixModules.forEach((module) => {
                let perm = allPerms.find(p => p.role === role && p.moduleName === module);
                if (!perm) {
                    perm = {
                        role: role, moduleName: module,
                        canView: false, canCreate: false, canEdit: false, canDelete: false,
                        canViewFund: false
                    };
                }
                
                roleHtml += `
                    <tr data-role="${role}" data-module="${module}">
                        <td class="fw-bold text-start ps-3">${module === 'Accounting Vouchers' ? 'Accounting Vouchers (F8/F6)' : module}</td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canView" ${perm.canView ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canCreate" ${perm.canCreate ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canEdit" ${perm.canEdit ? 'checked' : ''}></td>
                        <td class="align-middle"><input type="checkbox" class="form-check-input perm-cb" data-field="canDelete" ${perm.canDelete ? 'checked' : ''}></td>
                        <td class="align-middle bg-light"><input type="checkbox" class="form-check-input perm-cb" data-field="canViewFund" ${perm.canViewFund ? 'checked' : ''}></td>
                    </tr>`;
            });
            
            roleHtml += `</tbody></table></div></div>`;
            container.innerHTML += roleHtml;
        });
    } catch (e) {
        showNotification('Error loading permissions matrix: ' + e.message, 'danger');
        console.error(e);
    }
}

async function savePermissionsMatrix() {
    const payload = [];
    document.querySelectorAll('.permissions-matrix-table tbody tr').forEach(tr => {
        const p = {
            role: tr.dataset.role,
            moduleName: tr.dataset.module,
            canView: false, canCreate: false, canEdit: false, canDelete: false,
            canViewFund: false
        };
        tr.querySelectorAll('.perm-cb').forEach(cb => {
            p[cb.dataset.field] = cb.checked;
        });
        payload.push(p);
    });

    try {
        const res = await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showNotification('Permissions saved successfully!');
        } else {
            showNotification('Failed to save permissions', 'danger');
        }
    } catch (e) {
        showNotification('Error saving permissions: ' + e.message, 'danger');
        console.error(e);
    }
}
document.getElementById('clearLogsBtn')?.addEventListener('click', async () => {
    if(!confirm("Are you sure you want to clear ALL error logs? This cannot be undone.")) return;
    try {
        const res = await fetch('/api/logs/error', {
            method: 'DELETE',
            headers: { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') }
        });
        if (res.ok) {
            showNotification('Logs cleared successfully');
            loadErrorLogs();
        } else {
            showNotification('Failed to clear logs', 'danger');
        }
    } catch(e) {
        showNotification('Error: ' + e.message, 'danger');
    }
});

// Add Keyboard Shortcut ` (backtick) to focus on Product Select
document.addEventListener('keydown', (e) => {
    // Check if the key pressed is ` (backtick) or Backquote
    if (e.key === '`' || e.code === 'Backquote') {
        const prodSelect = document.getElementById('billProductSelect');
        // Check if the product select is actually visible on the screen
        if (prodSelect && prodSelect.offsetParent !== null) {
            e.preventDefault();
            prodSelect.focus();
        }
    }
});

// Dashboard Interactions
function setupDashboardCardClicks() {
    document.getElementById('cardTopSalesman')?.addEventListener('click', () => {
        document.getElementById('periodToday').checked = true;
        document.querySelectorAll('.custom-date-fields').forEach(el => el.classList.add('d-none'));
        loadSalesmanReport();
    });

    document.getElementById('cardTodaySales')?.addEventListener('click', () => {
        jumpToSalesEntriesWithDate(0);
    });

    document.getElementById('cardWeeklySales')?.addEventListener('click', () => {
        jumpToSalesEntriesWithDate(7);
    });

    document.getElementById('cardMonthlySales')?.addEventListener('click', () => {
        jumpToSalesEntriesWithDate('month');
    });

    document.querySelectorAll('input[name="salesmanReportPeriod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const customFields = document.querySelectorAll('.custom-date-fields');
            if (val === 'custom') {
                customFields.forEach(el => el.classList.remove('d-none'));
                document.getElementById('salesmanReportTable').querySelector('tbody').innerHTML = '';
                document.getElementById('salesmanReportQtyHeader').innerText = 'CUSTOM (QTY)';
            } else {
                customFields.forEach(el => el.classList.add('d-none'));
                loadSalesmanReport();
            }
        });
    });

    document.getElementById('btnFilterSalesmanReport')?.addEventListener('click', () => {
        const start = document.getElementById('salesmanReportStartDate').value;
        const end = document.getElementById('salesmanReportEndDate').value;
        loadSalesmanReport(start, end);
    });
}

function jumpToSalesEntriesWithDate(daysAgo) {
    document.querySelector('[data-target="entries"]').click();
    const form = document.getElementById('filterForm');
    form.reset();
    
    const today = new Date();
    let start = new Date();
    
    if (daysAgo === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
        start.setDate(today.getDate() - daysAgo);
    }
    
    const formatDate = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    form.querySelector('[name="startDate"]').value = formatDate(start);
    form.querySelector('[name="endDate"]').value = formatDate(today);
    
    // Load entries directly instead of dispatching submit to avoid native reloads
    currentPage = 0;
    if (typeof loadEntries === 'function') {
        loadEntries();
    }
}

async function loadSalesmanReport(start = '', end = '') {
    try {
        let url = `/api/dashboard/salesman-report`;
        if (start && end) url += `?startDate=${start}&endDate=${end}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        const period = document.querySelector('input[name="salesmanReportPeriod"]:checked').value;
        const tbody = document.querySelector('#salesmanReportTable tbody');
        const header = document.getElementById('salesmanReportQtyHeader');
        tbody.innerHTML = '';
        
        data.forEach(s => {
            if (period === 'today') { s._sortQty = s.todayQty; header.innerText = 'TODAY (QTY)'; }
            else if (period === 'weekly') { s._sortQty = s.weeklyQty; header.innerText = 'WEEKLY (QTY)'; }
            else if (period === 'monthly') { s._sortQty = s.monthlyQty; header.innerText = 'MONTHLY (QTY)'; }
            else if (period === 'custom') { s._sortQty = s.customQty; header.innerText = 'CUSTOM (QTY)'; }
        });

        // Sort descending by qty
        data.sort((a, b) => b._sortQty - a._sortQty);

        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHTML(s.salesmanName)}</td>
                <td>${s._sortQty}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {
        showNotification('Error loading salesman report', 'danger');
    }
}


async function updateDevAdmin() {
    const username = document.getElementById("devAdminUsername").value;
    const password = document.getElementById("devAdminPassword").value;
    
    try {
        const res = await fetch("/api/users/update-developer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (res.ok) {
            showNotification("Developer credentials updated successfully!", "success");
            bootstrap.Modal.getInstance(document.getElementById("devAdminModal")).hide();
        } else {
            showNotification("Failed to update credentials.", "danger");
        }
    } catch (e) {
        showNotification("Error updating developer credentials", "danger");
    }
}

// Global Autofocus for Modals
document.addEventListener('shown.bs.modal', function (event) {
    const modal = event.target;
    let targetInput = modal.querySelector('[autofocus]');
    if (!targetInput) {
        targetInput = modal.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly]):not([type="radio"]):not([type="checkbox"]), textarea, select');
    }
    if (targetInput) {
        targetInput.focus();
    }
});


// Auto-fill date for Not Attended
document.getElementById('callStatus').addEventListener('change', function() {
    if (this.value === 'Not Attended') {
        let tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        document.getElementById('callNextDate').value = tmrw.toISOString().split('T')[0];
    }
});

// Calling Dashboard Filter Function


// Handle Outcome Change in Modal
window.handleOutcomeChange = function(outcome) {
    const reasonDiv = document.getElementById('reasonDiv');
    const reasonSelect = document.getElementById('callReason');
    
    if (outcome === 'Not Satisfied' || outcome === 'Not Interested') {
        reasonDiv.style.display = 'block';
        reasonSelect.innerHTML = '<option value=\"\">Select Reason</option>';
        if (outcome === 'Not Satisfied') {
            reasonSelect.innerHTML += '<option value=\"Change Salesmen\">Change Salesmen</option>';
            reasonSelect.innerHTML += '<option value=\"Product Issues\">Product Issues</option>';
            reasonSelect.innerHTML += '<option value=\"Product Quality\">Product Quality</option>';
        } else if (outcome === 'Not Interested') {
            reasonSelect.innerHTML += '<option value=\"Not Interested for Calling\">Not Interested for Calling</option>';
            reasonSelect.innerHTML += '<option value=\"Job Quit\">Job Quit</option>';
        }
    } else {
        reasonDiv.style.display = 'none';
        reasonSelect.value = '';
    }
};

window.toggleDashCustomDates = function() {
    const type = document.getElementById('dashFilterType').value;
    if (type === 'custom') {
        document.getElementById('dashStartDate').classList.remove('d-none');
        document.getElementById('dashEndDate').classList.remove('d-none');
    } else {
        document.getElementById('dashStartDate').classList.add('d-none');
        document.getElementById('dashEndDate').classList.add('d-none');
    }
};

window.loadCallingDashboard = async function() {
    try {
        const type = document.getElementById('dashFilterType').value;
        let url = `/api/calling/stats?filterType=${type}`;
        if (type === 'custom') {
            const sd = document.getElementById('dashStartDate').value;
            const ed = document.getElementById('dashEndDate').value;
            if (sd && ed) {
                url += `&startDate=${sd}&endDate=${ed}`;
            }
        }
        
        const res = await fetch(url);
        const stats = await res.json();
        document.getElementById('statTotalCallsToday').textContent = stats.totalCallsToday || 0;
        document.getElementById('statPendingFollowupsToday').textContent = stats.pendingFollowupsToday || 0;
        document.getElementById('statSatisfiedCalls').textContent = stats.satisfiedCalls || 0;
        document.getElementById('statNotSatisfiedCalls').textContent = stats.notSatisfiedCalls || 0;
        if(document.getElementById('statReasonChangeSalesmen')) document.getElementById('statReasonChangeSalesmen').textContent = stats.reasonChangeSalesmen || 0;
        if(document.getElementById('statReasonProductIssues')) document.getElementById('statReasonProductIssues').textContent = stats.reasonProductIssues || 0;
        if(document.getElementById('statReasonProductQuality')) document.getElementById('statReasonProductQuality').textContent = stats.reasonProductQuality || 0;
        if(document.getElementById('statReasonProductExpensive')) document.getElementById('statReasonProductExpensive').textContent = stats.reasonProductExpensive || 0;
        
        // Hide details table when refreshing dashboard
        document.getElementById('dashboardDetailsContainer').classList.add('d-none');
    } catch (e) {
        console.error('Failed to load calling dashboard', e);
    }
};

window.loadDashboardDetails = async function(cardType) {
    try {
        const type = document.getElementById('dashFilterType').value;
        let url = `/api/calling/dashboard-details?cardType=${encodeURIComponent(cardType)}&filterType=${type}`;
        if (type === 'custom') {
            const sd = document.getElementById('dashStartDate').value;
            const ed = document.getElementById('dashEndDate').value;
            if (sd && ed) {
                url += `&startDate=${sd}&endDate=${ed}`;
            }
        }
        
        const res = await fetch(url);
        const records = await res.json();
        
        document.getElementById('dashboardDetailsTitle').textContent = cardType + ' Details';
        document.getElementById('dashboardDetailsContainer').classList.remove('d-none');
        
        const tbody = document.querySelector('#dashboardDetailsTable tbody');
        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan=\"8\" class=\"text-center text-muted\">No records found.</td></tr>';
            return;
        }
        
        records.forEach(c => {
            let statusBadge = c.callStatus ? `<span class=\"badge bg-secondary\">${c.callStatus}</span>` : '-';
            if (c.callStatus === 'Attended') statusBadge = `<span class=\"badge bg-success\">Attended</span>`;
            if (c.callStatus === 'Not Attended') statusBadge = `<span class=\"badge bg-danger\">Not Attended</span>`;
            
            tbody.innerHTML += `<tr>
                <td class=\"fw-bold\">${escapeHTML(c.customerName || '')}</td>
                <td>${escapeHTML(c.contactNumber || '')}</td>
                <td>${c.callDate ? new Date(c.callDate).toLocaleString() : '-'}</td>
                <td>${c.nextCallDate ? c.nextCallDate : '-'}</td>
                <td>${statusBadge}</td>
                <td>${escapeHTML(c.callOutcome || '-')}</td>
                <td>${escapeHTML(c.reason || '-')}</td>
                <td>${escapeHTML(c.remarks || '-')}</td>
            </tr>`;
        });
        
        // Scroll down to the table so user can see it
        document.getElementById('dashboardDetailsContainer').scrollIntoView({ behavior: 'smooth' });
    } catch(e) {
        console.error('Failed to load dashboard details', e);
    }
};




// Handle Customer Edit Form Submit
document.getElementById('editCustomerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    
    const data = Object.fromEntries(new FormData(e.target));
    if (data.nextSalesmanId === "") data.nextSalesmanId = null;
    if (data.fixedDiscount === "") data.fixedDiscount = null;
    const id = data.id;
    try {
        const res = await fetch(`/api/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showNotification('Customer updated successfully', 'success');
            bootstrap.Modal.getOrCreateInstance(document.getElementById('editCustomerModal')).hide();
            loadUniqueCustomersTable();
            loadUniqueCustomers();
        } else {
            showNotification(await res.text(), 'danger');
        }
    } catch(err) {
        console.error(err);
        showNotification('Error updating customer', 'danger');
    } finally {
        if (btn) btn.disabled = false;
    }
});

// Update Sales Bill customer change logic
document.getElementById('billCustomer')?.addEventListener('change', function(e) {
    const custId = e.target.value;
    if (custId && typeof uniqueCustomers !== 'undefined' && uniqueCustomers) {
        const c = uniqueCustomers.find(x => x.id == custId);
        if (c && c.fixedDiscount) {
            document.getElementById('billDiscount').value = c.fixedDiscount;
        }
    }
});

// Open Customer Edit Modal
window.editCustomer = async function(id) {
    try {
        if (!uniqueCustomers || uniqueCustomers.length === 0) {
            const res = await fetch('/api/customers');
            uniqueCustomers = await res.json();
        }
        const c = uniqueCustomers.find(x => x.id == id);
        if (!c) {
            showNotification('Customer data not found in cache. Please refresh.', 'danger');
            return;
        }
        
        document.getElementById('editCustomerId').value = c.id;
        document.getElementById('editCustomerName').value = c.customerName || '';
        document.getElementById('editCustomerContact').value = c.contactNumber || '';
        document.getElementById('editCustomerCity').value = c.city || '';
        document.getElementById('editCustomerDiscount').value = c.fixedDiscount || '';
        
        const sSelect = document.getElementById('editCustomerSalesman');
        sSelect.innerHTML = '<option value="">Select Salesman...</option>';
        
        if (!allSalesmen || allSalesmen.length === 0) {
            const res = await fetch('/api/salesmen');
            if (res.ok) allSalesmen = await res.json();
        }
        
        if (allSalesmen) {
            allSalesmen.forEach(s => {
                sSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        
        if (c.nextSalesmanId) {
            sSelect.value = c.nextSalesmanId;
        }
        
        const modalEl = document.getElementById('editCustomerModal');
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        modal.show();
    } catch(err) {
        console.error('Error opening edit customer modal:', err);
    }
};

// ==========================================
// SUPPORT TICKET LOGIC
// ==========================================
async function loadSupportTickets() {
    try {
        const res = await fetch('/api/tickets/list');
        if (!res.ok) throw new Error('Failed to fetch tickets');
        const tickets = await res.json();
        
        const tbody = document.querySelector('#supportTicketTable tbody');
        tbody.innerHTML = '';
        tickets.forEach(t => {
            let actionBtn = '';
            let statusBadge = `<span class="badge bg-danger">OPEN</span>`;
            if (t.status === 'OPEN') {
                actionBtn = `<button class="btn btn-sm btn-success" onclick="markTicketSolved(${t.id})">Mark Solved</button>`;
            } else {
                statusBadge = `<span class="badge bg-success">SOLVED</span>`;
                actionBtn = `<span class="text-muted">Solved</span>`;
            }

            tbody.innerHTML += `
            <tr>
                <td>${t.id}</td>
                <td>${escapeHTML(t.customerName)}</td>
                <td>${escapeHTML(t.contactNumber)}</td>
                <td>${escapeHTML(t.reason || '')}</td>
                <td>${escapeHTML(t.remarks || '')}</td>
                <td>${statusBadge}</td>
                <td>${new Date(t.createdDate).toLocaleString()}</td>
                <td>${actionBtn}</td>
            </tr>`;
        });
        updateSupportTicketBadge();
    } catch (e) {
        console.error(e);
        document.querySelector('#supportTicketTable tbody').innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load support tickets.</td></tr>`;
    }
}

async function markTicketSolved(id) {
    if(!confirm('Are you sure this ticket is solved?')) return;
    try {
        const res = await fetch(`/api/tickets/${id}/solve`, { method: 'POST' });
        if (res.ok) {
            loadSupportTickets();
        } else {
            alert('Failed to mark as solved.');
        }
    } catch (e) { console.error(e); }
}

async function updateSupportTicketBadge() {
    try {
        const res = await fetch('/api/tickets/count');
        if (res.ok) {
            const count = await res.json();
            const badge = document.getElementById('navSupportTicketBadge');
            if(badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('d-none');
                } else {
                    badge.classList.add('d-none');
                }
            }
        }
    } catch (e) {}
}
