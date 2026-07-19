import psycopg2
conn = psycopg2.connect('postgresql://neondb_owner:npg_UDahb2eZqz1i@ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require')
cur = conn.cursor()
try:
    sql = """
    ALTER TABLE bills DROP CONSTRAINT fkoy9sc2dmxj2qwjeiiilf3yuxp;
    ALTER TABLE bills ADD CONSTRAINT fkoy9sc2dmxj2qwjeiiilf3yuxp FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    
    ALTER TABLE sales_records DROP CONSTRAINT fkmx15x3hbk48qplxpq06trl8df;
    ALTER TABLE sales_records ADD CONSTRAINT fkmx15x3hbk48qplxpq06trl8df FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
    
    ALTER TABLE bill_items DROP CONSTRAINT fkj9o7g8krc56gf6t6f0sy4ic5p;
    ALTER TABLE bill_items ADD CONSTRAINT fkj9o7g8krc56gf6t6f0sy4ic5p FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
    """
    cur.execute(sql)
    conn.commit()
    print('Successfully updated foreign keys to CASCADE DELETE.')
except Exception as e:
    print('Error:', e)
