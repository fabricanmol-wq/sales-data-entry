import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os
import sys

# --- CONFIGURATION ---
# Path to your local SQLite database
SQLITE_DB_PATH = 'sales.db'

# Your Neon/Render PostgreSQL Connection String
POSTGRES_URL = os.environ.get('POSTGRES_URL', 'postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')

if not POSTGRES_URL:
    print("Please set the POSTGRES_URL environment variable or hardcode it in this script.")
    sys.exit(1)

def get_tables(sqlite_cursor):
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    return [row[0] for row in sqlite_cursor.fetchall()]

def migrate_table(sqlite_cursor, pg_cursor, table_name, pg_conn, valid_ids):
    try:
        # Fetch all data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
    except sqlite3.OperationalError:
        print(f"Skipping table {table_name} as it does not exist in SQLite.")
        return
        
    if not rows:
        print(f"Skipping empty table: {table_name}")
        return

    # Get column names
    col_names = [description[0] for description in sqlite_cursor.description]
    cols_str = ', '.join([f'"{col}"' for col in col_names])
    
    # Get column types from postgres
    pg_cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'")
    pg_types = {row[0]: row[1] for row in pg_cursor.fetchall()}
    
    import datetime
    # Process rows to fix booleans and dates and foreign keys
    processed_rows = []
    for row in rows:
        new_row = []
        for i, val in enumerate(row):
            col_name = col_names[i]
            pg_type = pg_types.get(col_name)
            
            # Foreign key scrubbing
            if val is not None:
                if col_name.endswith('_id'):
                    ref_table = None
                    if col_name == 'created_by_user_id': ref_table = 'users'
                    elif col_name == 'customer_id': ref_table = 'customers'
                    elif col_name == 'salesman_id': ref_table = 'salesmen'
                    elif col_name == 'bill_id': ref_table = 'bills'
                    elif col_name == 'product_id': ref_table = 'products'
                    elif col_name == 'next_salesman_id': ref_table = 'salesmen'
                    
                    if ref_table and ref_table in valid_ids:
                        if val not in valid_ids[ref_table]:
                            print(f"Warning: Scrubbing missing foreign key {val} for {col_name} in {table_name}")
                            val = None

            if pg_type == 'boolean':
                new_row.append(bool(val))
            elif pg_type in ('timestamp without time zone', 'timestamp with time zone', 'date') and isinstance(val, int):
                if val > 10000000000: # it's in milliseconds
                    dt = datetime.datetime.fromtimestamp(val / 1000.0)
                else:
                    dt = datetime.datetime.fromtimestamp(val)
                
                if pg_type == 'date':
                    new_row.append(dt.date())
                else:
                    new_row.append(dt)
            else:
                new_row.append(val)
        processed_rows.append(tuple(new_row))

    try:
        print(f"Migrating {len(processed_rows)} rows into {table_name}...")
        insert_query = f'INSERT INTO "{table_name}" ({cols_str}) VALUES %s'
        execute_values(pg_cursor, insert_query, processed_rows)
        
        if 'id' in col_names:
            pg_cursor.execute(f"""
                SELECT setval(pg_get_serial_sequence('"{table_name}"', 'id'), coalesce(max(id),0) + 1, false) FROM "{table_name}";
            """)
        pg_conn.commit()
    except Exception as e:
        print(f"Error migrating table {table_name}: {e}")
        pg_conn.rollback()

def main():
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"SQLite database not found at {SQLITE_DB_PATH}")
        sys.exit(1)

    print("Connecting to databases...")
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_cursor = sqlite_conn.cursor()

    try:
        pg_conn = psycopg2.connect(POSTGRES_URL)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    tables = [
        'users',
        'role_permissions',
        'settings',
        'salesmen',
        'customers',
        'products',
        'sales_records',
        'bills',
        'bill_items',
        'call_records',
        'stock_entries',
        'support_tickets',
        'error_logs'
    ]
    
    print("Truncating tables to prevent duplicate key errors...")
    for table in tables:
        try:
            pg_cursor.execute(f'TRUNCATE TABLE "{table}" CASCADE')
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback() # Table might not exist yet if skipped
    
    valid_ids = {}
    for table in tables:
        try:
            sqlite_cursor.execute(f"SELECT id FROM {table}")
            valid_ids[table] = {row[0] for row in sqlite_cursor.fetchall()}
        except Exception:
            valid_ids[table] = set()

    for table in tables:
        migrate_table(sqlite_cursor, pg_cursor, table, pg_conn, valid_ids)
        
    pg_conn.commit()
    print("Migration completed successfully!")
    
    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    main()
