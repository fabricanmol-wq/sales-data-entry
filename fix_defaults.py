import glob
import re

files = glob.glob('src/main/java/com/salesdata/entity/*.java')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to remove 'DEFAULT <something>' from columnDefinition
    # Or just remove columnDefinition entirely if we don't need it!
    # But some might specify 'DECIMAL(12,2)' which we want to keep.
    # Pattern to find: columnDefinition = "something DEFAULT value"
    # we replace with: columnDefinition = "something"
    new_content = re.sub(r'(columnDefinition\s*=\s*\"[^\"]*?)\s+DEFAULT\s+[^\"]*\"', r'\1"', content, flags=re.IGNORECASE)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed {f}")
