import re

ids = ['filterSalesman', 'entrySalesman', 'entriesTableBody', 'customerList', 'customersTable', 'ledgerTable', 'usersTableBody', 'salesmenTableBody', 'callingTable', 'callingReportTable', 'stockTable', 'billsTable', 'billProductSelect', 'billSalesman', 'billItemsTable', 'invItemsTable', 'permissionsMatrixContainer']

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    content = f.read()

for el_id in ids:
    if f'id="{el_id}"' not in content and f"id='{el_id}'" not in content:
        print(f"Missing ID: {el_id}")
