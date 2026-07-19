import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    cur.execute('CREATE TABLE IF NOT EXISTS test_parent (id INT PRIMARY KEY); CREATE TABLE IF NOT EXISTS test_child (id INT PRIMARY KEY, parent_id INT REFERENCES test_parent(id));')
    cur.execute('TRUNCATE TABLE test_parent CASCADE;')
    print('Success')
except Exception as e:
    print('Error:', e)

