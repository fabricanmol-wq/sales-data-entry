import urllib.request, json
url = 'https://api.render.com/v1/services/srv-d9bahfd7vvec73cd5b20/deploys/dep-d9e9tlv41pts73ehc1fg'
req = urllib.request.Request(url, headers={'Authorization': 'Bearer rnd_igKrMEpGlTaC4InWD43kDmtODYRB', 'Accept': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print('Error:', e)

