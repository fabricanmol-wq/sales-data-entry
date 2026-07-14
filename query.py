import sqlite3
conn = sqlite3.connect('sales.db')
c = conn.cursor()
c.execute("""
SELECT c.id, c.customer_name, c.contact_number, c.city, COALESCE(SUM(s.credit_amount), 0), COUNT(*)
FROM customers c
LEFT JOIN sales_records s ON s.customer_id = c.id AND s.is_deleted = 0
WHERE c.is_deleted = 0
GROUP BY c.id, c.customer_name, c.contact_number, c.city
""")
for row in c.fetchall():
    if row[1] == 'Deepak':
        print(row)
