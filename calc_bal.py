import json
with open('check_deepak_dates.py', 'r') as f:
    pass

import sqlite3

def calc_balance(customer_id):
    conn = sqlite3.connect('sales.db')
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM sales_records WHERE customer_id=? ORDER BY entry_date, id", (customer_id,)).fetchall()
    
    bal = 0
    print("Tracing Balance:")
    for r in rows:
        r = dict(r)
        if r['is_deleted']: continue
        
        # replicate JS logic
        if r['credit_amount'] < 0: # payment
            bal -= abs(r['credit_amount'])
        else:
            bal += r['net_amount']
            imm = r['net_amount'] - r['credit_amount']
            if imm > 0:
                bal -= imm
        
        print(f"Date: {r['entry_date']} | ID: {r['id']:<3} | Remarks: {r['remarks'][:15]:<15} | Net: {r['net_amount']:<8} | Cred: {r['credit_amount']:<8} | Bal: {bal}")
    print("Final Balance:", bal)

calc_balance(1)
