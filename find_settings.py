import re
with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    app_html = f.read()

idx = app_html.find('id="settingsSection"')
if idx == -1:
    idx = app_html.find("id='settingsSection'")
    
print("Found at:", idx)
if idx != -1:
    # Print the lines around it
    lines = app_html.split('\n')
    for i, line in enumerate(lines):
        if 'settingsSection' in line:
            for j in range(max(0, i-5), min(len(lines), i+20)):
                print(f"{j+1}: {lines[j]}")
