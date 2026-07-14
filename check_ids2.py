import re

with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    app_html = f.read()

ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", app_js))

for element_id in ids:
    if f'id="{element_id}"' not in app_html and f"id='{element_id}'" not in app_html:
        print(f"Missing ID in app.html: {element_id}")
