import urllib.request, json, urllib.error
data = {'type': 'web_service', 'name': 'sales-data-entry', 'ownerId': 'tea-d95rkfhoagis73975850', 'repo': 'https://github.com/limitxpand/sales-data-entry', 'autoDeploy': 'yes', 'branch': 'master', 'serviceDetails': {'env': 'docker', 'envSpecificDetails': {'dockerContext': '.'}, 'envVars': [{'key': 'SPRING_PROFILES_ACTIVE', 'value': 'prod'}, {'key': 'SPRING_DATASOURCE_URL', 'value': 'jdbc:postgresql://ep-still-cake-atqlraiy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require'}, {'key': 'SPRING_DATASOURCE_USERNAME', 'value': 'neondb_owner'}, {'key': 'SPRING_DATASOURCE_PASSWORD', 'value': 'npg_UDahb2eZqz1i'}]}}
req = urllib.request.Request('https://api.render.com/v1/services', data=json.dumps(data).encode('utf-8'), headers={'Authorization': 'Bearer rnd_8qpYNdig1rQFBAqwq5ugcUYP6xvP', 'Accept': 'application/json', 'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
