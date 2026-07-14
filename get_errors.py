import sqlite3
import pandas as pd

conn = sqlite3.connect('sales.db')
query = 'SELECT * FROM error_log ORDER BY id DESC LIMIT 5;'
try:
    df = pd.read_sql_query(query, conn)
    print(df.to_string())
except Exception as e:
    print(e)
conn.close()
