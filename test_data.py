import requests

s = requests.Session()
r = s.get('http://localhost:8080/api/auth/status')
csrf = s.cookies.get('XSRF-TOKEN')

res = s.post('http://localhost:8080/api/auth/login', 
             data={'username':'Anmol0001', 'password':'Anmol0001'}, 
             headers={'X-XSRF-TOKEN': csrf})
print('Login:', res.status_code)

# Fetch new CSRF token after login
csrf = s.cookies.get('XSRF-TOKEN')
headers = {'X-XSRF-TOKEN': csrf}

# 1. Create Product
p_res = s.post('http://localhost:8080/api/products', json={'name':'Test Item', 'price': 100}, headers=headers)
print('Create Product:', p_res.status_code, p_res.text)

# 2. Create Salesman
s_res = s.post('http://localhost:8080/api/salesmen', json={'name':'John Doe', 'phoneNumber':'1234567890', 'isActive':True}, headers=headers)
print('Create Salesman:', s_res.status_code, s_res.text)

# 3. Create Customer
c_res = s.post('http://localhost:8080/api/customers', json={'customerName':'Alice', 'contactNumber':'9999999999', 'city':'Test City'}, headers=headers)
print('Create Customer:', c_res.status_code, c_res.text)

# 4. Create Bill
bill_data = {
    'customerName': 'Alice',
    'contactNumber': '9999999999',
    'city': 'Test City',
    'salesmanId': 1,
    'totalAmount': 100,
    'discount': 10,
    'netAmount': 90,
    'paidAmount': 90,
    'items': [{'productName': 'Test Item', 'quantity': 1, 'price': 100, 'total': 100}]
}
b_res = s.post('http://localhost:8080/api/billing', json=bill_data, headers=headers)
print('Create Bill:', b_res.status_code, b_res.text)

# 5. Fetch endpoints again
print("Fetching Dashboard Stats:", s.get('http://localhost:8080/api/dashboard/stats').status_code)
print("Fetching Sales:", s.get('http://localhost:8080/api/sales').status_code)
print("Fetching Billing:", s.get('http://localhost:8080/api/billing').status_code)
print("Fetching Customers:", s.get('http://localhost:8080/api/customers').status_code)
