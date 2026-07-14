import sqlite3
import pandas as pd

conn = sqlite3.connect('sales.db')
query = "SELECT name FROM sqlite_master WHERE type='table';"
df = pd.read_sql_query(query, conn)
print(df.to_string())

query2 = "SELECT * FROM error_logs ORDER BY id DESC LIMIT 5;"
try:
    df2 = pd.read_sql_query(query2, conn)
    print(df2.to_string())
except Exception as e:
    pass
conn.close()
