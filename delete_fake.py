import sqlite3
conn = sqlite3.connect('sales.db')
conn.execute("DELETE FROM sales_records WHERE remarks = 'Payment Received via unified entry' AND credit_amount IN (-200000, -10620)")
conn.commit()
conn.close()
