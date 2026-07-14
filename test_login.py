import requests

session = requests.Session()
response = session.get('http://localhost:8080/index.html')
csrf = session.cookies.get('XSRF-TOKEN')

login_data = {'username': 'Anmol0001', 'password': 'password'}
headers = {'X-XSRF-TOKEN': csrf}
response = session.post('http://localhost:8080/api/auth/login', data=login_data, headers=headers)
print("Login status:", response.status_code)

response2 = session.get('http://localhost:8080/api/tickets/list', headers={'X-XSRF-TOKEN': csrf})
print("Tickets status:", response2.status_code)
print("Tickets body:", response2.text)
