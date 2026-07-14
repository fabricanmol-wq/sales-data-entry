import sqlite3

try:
    conn = sqlite3.connect('sales.db')
    
    # Check if bills has customer_id
    cursor = conn.execute("PRAGMA table_info(bills)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'customer_id' in columns:
        print("Migrating bills table to remove customer_id...")
        
        # Create new table
        conn.execute("""
            CREATE TABLE bills_new (
                id integer primary key autoincrement,
                bill_date timestamp not null,
                credit_amount float not null,
                discount float not null,
                net_amount float not null,
                paid_amount float not null,
                total_amount float not null,
                created_by_user_id bigint,
                city varchar(255),
                contact_number varchar(255) not null,
                customer_name varchar(255) not null,
                salesman_id bigint
            )
        """)
        
        # Copy data
        conn.execute("""
            INSERT INTO bills_new (id, bill_date, credit_amount, discount, net_amount, paid_amount, total_amount, created_by_user_id, city, contact_number, customer_name, salesman_id)
            SELECT id, bill_date, credit_amount, discount, net_amount, paid_amount, total_amount, created_by_user_id, city, contact_number, customer_name, salesman_id 
            FROM bills
        """)
        
        # Drop old table and rename new one
        conn.execute("DROP TABLE bills")
        conn.execute("ALTER TABLE bills_new RENAME TO bills")
        
        conn.commit()
        print("Migration complete!")
    else:
        print("No migration needed, customer_id not found.")
        
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
