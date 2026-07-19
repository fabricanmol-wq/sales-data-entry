import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
tables = cur.fetchall()
for t in tables:
    table_name = t[0]
    if table_name.startswith('sqlite_') or table_name.startswith('pg_'): continue
    print(f'Checking {table_name}')
    cur.execute(f'SELECT COUNT(*) FROM "{table_name}"')
    count = cur.fetchone()[0]
    print(f'Table {table_name} has {count} rows')
