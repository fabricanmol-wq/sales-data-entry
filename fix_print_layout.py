import re

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update wrapper to hide on print
content = content.replace('<div class="d-flex" id="wrapper">', '<div class="d-flex d-print-none" id="wrapper">')

# 2. Extract and remove the print invoice area from its current location
start_marker = "<!-- Print Invoice Area (hidden until print) -->"
end_marker = "<!-- Reports Section -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # We want to keep everything before start_idx and from end_marker onwards
    print_area_block = content[start_idx:end_idx].strip()
    
    # Remove the block, but keep the indentation and spacing clean
    content = content[:start_idx] + "                    " + content[end_idx:]

    # 3. Inject the print_area_block right before the script tags
    injection_point = "<!-- Bootstrap JS Bundle -->"
    inj_idx = content.find(injection_point)
    if inj_idx != -1:
        content = content[:inj_idx] + print_area_block + "\n\n    " + content[inj_idx:]
        
        with open('src/main/resources/static/app.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully updated app.html")
    else:
        print("Error: Could not find insertion point")
else:
    print("Error: Could not find start or end markers")
