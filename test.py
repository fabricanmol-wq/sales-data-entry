import sqlite3
c = sqlite3.connect('sales.db')
print(c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'").fetchone()[0])
