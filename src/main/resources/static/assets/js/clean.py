import re

with open('src/main/resources/static/assets/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove old loadCallingDashboard
pattern1 = r"async function loadCallingDashboard\(\) \{.*?\n\}\n"
content = re.sub(pattern1, "", content, flags=re.DOTALL)

# Remove window.filterCallingReports block
pattern2 = r"window\.filterCallingReports = function\(outcome, reason\) \{.*?\};\n"
content = re.sub(pattern2, "", content, flags=re.DOTALL)

with open('src/main/resources/static/assets/js/dashboard_logic.js', 'r', encoding='utf-8') as f:
    new_logic = f.read()
    
content = content + '\n\n' + new_logic

with open('src/main/resources/static/assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
