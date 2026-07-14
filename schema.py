import sqlite3
conn = sqlite3.connect('sales.db')
print("--- Bills Schema ---")
print(conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bills'").fetchone()[0])
print("--- Sales Records Schema ---")
print(conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales_records'").fetchone()[0])
