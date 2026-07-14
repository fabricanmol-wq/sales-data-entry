import requests

s = requests.Session()
r = s.get('http://localhost:8080/api/auth/status')
csrf = s.cookies.get('XSRF-TOKEN')

res = s.post('http://localhost:8080/api/auth/login', 
             data={'username':'Anmol0001', 'password':'Anmol0001'}, 
             headers={'X-XSRF-TOKEN': csrf})
print('Login:', res.status_code)

apis = [
    '/api/billing',
    '/api/customers',
    '/api/sales',
    '/api/salesmen',
    '/api/products',
    '/api/users',
    '/api/permissions',
    '/api/permissions/me',
    '/api/settings',
    '/api/dashboard/stats',
    '/api/calling/stats'
]

for api in apis:
    print(f"Fetching {api}...")
    r = s.get(f'http://localhost:8080{api}')
    print(f"Status: {r.status_code}")
    if r.status_code >= 400:
        print(f"Error: {r.text[:500]}")
