import sqlite3
import json

conn = sqlite3.connect('sales.db')
cur = conn.cursor()
cur.execute("SELECT id FROM customers WHERE customer_name = 'Deepak' LIMIT 1")
row = cur.fetchone()
if row:
    customer_id = row[0]
    cur.execute("SELECT entry_date, bill_amount, net_amount, credit_amount FROM sales_records WHERE customer_id = ? ORDER BY entry_date", (customer_id,))
    rows = cur.fetchall()
    print("Records for Deepak:")
    for r in rows:
        print(r)
else:
    print("customers Deepak not found")
