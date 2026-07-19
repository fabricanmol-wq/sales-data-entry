import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    cur.execute('ALTER TABLE test_parent DISABLE TRIGGER ALL;')
    print('Success')
except Exception as e:
    print('Error:', e)

