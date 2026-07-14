import sqlite3, json, datetime
conn = sqlite3.connect('sales.db')
conn.row_factory = sqlite3.Row
res = [dict(r) for r in conn.execute("SELECT id, bill_type, remarks, net_amount, credit_amount, entry_date FROM sales_records WHERE customer_id=1 ORDER BY entry_date").fetchall()]
for r in res:
    r['date_str'] = datetime.datetime.fromtimestamp(r['entry_date']/1000).strftime('%Y-%m-%d %H:%M:%S')
print(json.dumps(res, indent=2))
