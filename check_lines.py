with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'id="invoicePrintArea"' in line:
        print(f"invoicePrintArea found at line {i+1}")
