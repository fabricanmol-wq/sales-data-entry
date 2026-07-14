import sqlite3
import json

conn = sqlite3.connect('sales.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM sales_records WHERE customer_id = (SELECT id FROM customers WHERE customer_name = 'Deepak' LIMIT 1) ORDER BY entry_date")
rows = cur.fetchall()
res = [dict(row) for row in rows]
print(json.dumps(res, indent=2))
