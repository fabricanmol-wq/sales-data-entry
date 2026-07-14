import urllib.request
import json

req = urllib.request.Request('http://localhost:8080/api/tickets/list', headers={'Cookie': 'XSRF-TOKEN=test', 'X-XSRF-TOKEN': 'test'})
try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("BODY:", e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", str(e))
