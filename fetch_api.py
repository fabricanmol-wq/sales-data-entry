import urllib.request, json
req = urllib.request.Request('http://localhost:8080/api/sales?customerName=Deepak&size=20', headers={'Cookie': 'JSESSIONID=something'})
try:
    res = urllib.request.urlopen(req)
    print(res.read())
except Exception as e:
    print(e)
