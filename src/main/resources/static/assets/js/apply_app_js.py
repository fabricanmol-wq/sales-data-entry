import re

with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add edit button to Customers List
btn_html = '''<button class="btn btn-sm btn-outline-primary me-2" onclick="editCustomer(${c.id})" title="Edit Customer"><i class="bi bi-pencil"></i></button>'''
content = content.replace('<button class="btn btn-sm btn-dark me-2" onclick="openLedgerModal', btn_html + '\n                                <button class="btn btn-sm btn-dark me-2" onclick="openLedgerModal')

# Append the customer_edit_logic.js
with open('src/main/resources/static/assets/js/customer_edit_logic.js', 'r', encoding='utf-8') as f:
    logic = f.read()
content += '\n\n' + logic

# Update Sales Bill customer change logic
new_cust_change = '''
document.getElementById('billCustomer')?.addEventListener('change', function(e) {
    const custId = e.target.value;
    if (custId && typeof allCustomers !== 'undefined' && allCustomers) {
        const c = allCustomers.find(x => x.id == custId);
        if (c && c.fixedDiscount) {
            document.getElementById('billDiscount').value = c.fixedDiscount;
        }
    }
});
'''
content += '\n\n' + new_cust_change

# Update Calling List allCustomers logic
content = content.replace("let url = '/api/calling/customers?';", '''
let url = '/api/calling/customers?';
        if (document.getElementById('callingShowAllCustomers') && document.getElementById('callingShowAllCustomers').checked) {
            url += 'allCustomers=true&';
        }
''')

with open('src/main/resources/static/assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
