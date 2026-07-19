import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    sql = 'INSERT INTO "error_logs" ("action_details", "error_message", "page_url", "id", "stack_trace", "timestamp", "username") VALUES (%s, %s, %s, %s, %s, %s, %s)'
    print(sql)
    cur.execute(sql, ('action', 'err', 'url', 9999, 'trace', '2026-07-19 10:00:00', 'Anmol0001'))
    conn.commit()
    print('Success')
except Exception as e:
    print('Error:', e)
