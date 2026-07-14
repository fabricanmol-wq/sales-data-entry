import requests

session = requests.Session()
# Get CSRF token
r = session.get('http://localhost:8080/')
csrf_token = session.cookies.get('XSRF-TOKEN')

# Login
login_data = {'username': 'Anmol0001', 'password': 'Anmol0001'}
headers = {'X-XSRF-TOKEN': csrf_token}
r_login = session.post('http://localhost:8080/api/auth/login', data=login_data, headers=headers)
print("Login Status:", r_login.status_code)

# Get tickets
r_tickets = session.get('http://localhost:8080/api/tickets/list')
print("Tickets Status:", r_tickets.status_code)
print("Tickets Body:", r_tickets.text)
