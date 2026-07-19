import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    # Truncate all business data tables, CASCADE will automatically handle foreign key dependencies
    sql = 'TRUNCATE TABLE bills, bill_items, sales_records, call_record, customers, salesmen, support_ticket CASCADE;'
    cur.execute(sql)
    conn.commit()
    print('Successfully truncated business data.')
except Exception as e:
    print('Error:', e)

