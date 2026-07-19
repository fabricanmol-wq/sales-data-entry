import psycopg2
import bcrypt
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    password = b'Anmol0001'
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt).decode('utf-8')
    cur.execute("INSERT INTO users (username, password, role, is_developer) VALUES (%s, %s, %s, %s)", ('Anmol0001', hashed, 'ADMIN', False))
    conn.commit()
    print('Inserted Anmol0001')
except Exception as e:
    print('Error:', e)
