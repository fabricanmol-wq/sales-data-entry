import sys
with open('src/main/resources/static/assets/js/app.js', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'loadDashboard' in line:
        print(f"{i+1}: {line.strip()}")
