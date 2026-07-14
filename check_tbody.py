import re

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    app_html = f.read()

queries = ['#billsTable tbody', '#billItemsTable tbody', '#stockTable tbody', '#recentEntriesTable tbody', '#ledgerTable tbody', '#customersTable tbody', '#callingReportTable tbody', '#callingTable tbody']

for query in queries:
    table_id = query.split()[0].replace('#', '')
    
    # check if table exists
    if f'id="{table_id}"' not in app_html and f"id='{table_id}'" not in app_html:
        print(f"Missing table ID: {table_id}")
    else:
        # check if it has tbody. A bit hard to parse HTML with regex perfectly, 
        # but we can check if <tbody> exists right after </thead> or something.
        # Let's find the table element and check if it has tbody inside it.
        start_idx = app_html.find(f'id="{table_id}"')
        if start_idx == -1:
            start_idx = app_html.find(f"id='{table_id}'")
        
        end_idx = app_html.find("</table>", start_idx)
        table_html = app_html[start_idx:end_idx]
        if "<tbody>" not in table_html and "<tbody " not in table_html:
            print(f"Missing tbody in table: {table_id}")
