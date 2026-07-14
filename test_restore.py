import requests

session = requests.Session()

# 1. First get the CSRF token by visiting the homepage
session.get("http://localhost:8080/index.html")
xsrf_token = session.cookies.get('XSRF-TOKEN')
print("Initial CSRF:", xsrf_token)

# 2. Login
login_url = "http://localhost:8080/api/auth/login"
headers = {}
if xsrf_token:
    headers['X-XSRF-TOKEN'] = xsrf_token
response = session.post(login_url, headers=headers, data={"username": "Anmol0001", "password": "Anmol0001"})
print("Login status:", response.status_code)
print("Login text:", response.text)

if response.status_code == 200:
    # 2. Get XSRF-TOKEN
    xsrf_token = session.cookies.get('XSRF-TOKEN')
    headers = {}
    if xsrf_token:
        headers['X-XSRF-TOKEN'] = xsrf_token
        
    # 3. Restore Backup
    restore_url = "http://localhost:8080/api/system/restore"
    with open("test_backup.db", "rb") as f:
        files = {'file': ('test_backup.db', f, 'application/octet-stream')}
        res = session.post(restore_url, headers=headers, files=files)
        print("Restore status:", res.status_code)
        print("Response:", res.text)
