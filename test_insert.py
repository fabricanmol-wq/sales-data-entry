import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    cur.execute('INSERT INTO "error_logs" ("action_details", "error_message", "page_url", "id", "stack_trace", "timestamp", "username") VALUES (%s, %s, %s, %s, %s, %s, %s)', ('a', 'e', 'p', 9999, 's', '2026-07-19 10:00:00', 'u'))
    conn.commit()
    print('Success')
except Exception as e:
    print('Error:', e)
