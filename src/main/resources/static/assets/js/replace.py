import re

content = open('src/main/resources/static/app.html', 'r', encoding='utf-8').read()

content = content.replace("onclick=\"filterCallingReports('', '')\"", "onclick=\"loadDashboardDetails('Total Calls')\"")
content = content.replace("onclick=\"filterCallingReports('Follow-up', '')\"", "onclick=\"loadDashboardDetails('Pending Follow-ups')\"")
content = content.replace("onclick=\"filterCallingReports('Satisfied', '')\"", "onclick=\"loadDashboardDetails('Satisfied')\"")
content = content.replace("onclick=\"filterCallingReports('Not Satisfied', '')\"", "onclick=\"loadDashboardDetails('Not Satisfied')\"")
content = content.replace("onclick=\"filterCallingReports('Not Satisfied', 'Change Salesmen')\"", "onclick=\"loadDashboardDetails('Change Salesmen')\"")
content = content.replace("onclick=\"filterCallingReports('Not Satisfied', 'Product Issues')\"", "onclick=\"loadDashboardDetails('Product Issues')\"")
content = content.replace("onclick=\"filterCallingReports('Not Satisfied', 'Product Quality')\"", "onclick=\"loadDashboardDetails('Product Quality')\"")

open('src/main/resources/static/app.html', 'w', encoding='utf-8').write(content)
