import re
with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()
matches = re.findall(r"querySelector\(['\"]([^'\"]+)['\"]\)\.innerHTML", app_js)
print("querySelectors:", set(matches))

matches_tbody = re.findall(r"querySelector\(['\"]([^'\"]+)['\"]\)", app_js)
print("All querySelectors:", set(matches_tbody))
