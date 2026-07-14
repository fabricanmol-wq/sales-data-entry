import urllib.request, base64

req = urllib.request.Request('http://127.0.0.1:8080/api/billing', headers={'Authorization': 'Basic ' + base64.b64encode(b'admin:admin').decode('utf-8')})
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except Exception as e:
    print("Error:", getattr(e, 'code', 'No code'))
    print(e.read().decode('utf-8') if hasattr(e, 'read') else str(e))
