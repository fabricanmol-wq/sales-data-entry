import os
import re

with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix openReminderModal hang
content = content.replace('    modal.show();\n    \n    try {\n        const res = await fetch', '    if (!modalEl.classList.contains(\\'show\\')) { modal.show(); }\n    \n    try {\n        const res = await fetch')

# Fix openPaymentFromLedger hang and prefilled amount
content = content.replace('    document.getElementById(\\'typeDebit\\').checked = true;\n    toggleEntryTypeMode();\n    \n    await loadProductsAndSalesmenForBill();\n    \n    bootstrap.Modal.getInstance(document.getElementById(\\'ledgerModal\\')).hide();\n    new bootstrap.Modal(document.getElementById(\\'billingModal\\')).show();', '    document.getElementById(\\'billPaidAmount\\').value = \\'\\';\n    document.getElementById(\\'typeDebit\\').checked = true;\n    await toggleEntryTypeMode();\n    \n    await loadProductsAndSalesmenForBill();\n    \n    bootstrap.Modal.getInstance(document.getElementById(\\'ledgerModal\\')).hide();\n    setTimeout(() => {\n        new bootstrap.Modal(document.getElementById(\\'billingModal\\')).show();\n    }, 400);')

# Fix openReceivePaymentFromReminder prefilled amount and double fetch
content = content.replace('        // Click to set type to DEBIT, which will fetch the Total Pending Credit using the filled details\n        document.getElementById(\\'typeDebit\\').click();\n        toggleEntryTypeMode(); // Ensure it runs to fetch the credit', '        document.getElementById(\\'billPaidAmount\\').value = \\'\\';\n        // Click to set type to DEBIT\n        document.getElementById(\\'typeDebit\\').checked = true;\n        toggleEntryTypeMode(); // Ensure it runs to fetch the credit')

with open('src/main/resources/static/assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('UI fixed in app.js')
