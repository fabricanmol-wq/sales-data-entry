import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'error_logs';")
    cols = cur.fetchall()
    print('error_logs schema:', cols)
except Exception as e:
    print('Error:', e)
