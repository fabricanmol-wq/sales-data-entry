import os

base_dir = "src/main/java/com/salesdata/controller"

replacements = [
    # BillingController -> 'Sales Entries'
    ("BillingController.java", "'Billing', 'VIEW'", "'Sales Entries', 'VIEW'"),
    ("BillingController.java", "'Billing', 'CREATE'", "'Sales Entries', 'CREATE'"),
    ("BillingController.java", "'Billing', 'EDIT'", "'Sales Entries', 'EDIT'"),
    ("BillingController.java", "'Billing', 'DELETE'", "'Sales Entries', 'DELETE'"),
    
    # ProductController -> 'Stock Management'
    ("ProductController.java", "'Inventory', 'VIEW'", "'Stock Management', 'VIEW'"),
    ("ProductController.java", "'Inventory', 'CREATE'", "'Stock Management', 'CREATE'"),
    ("ProductController.java", "'Inventory', 'EDIT'", "'Stock Management', 'EDIT'"),
    ("ProductController.java", "'Inventory', 'DELETE'", "'Stock Management', 'DELETE'"),
    
    # SalesRecordController
    ("SalesRecordController.java", "'Billing', 'VIEW'", "'Sales Entries', 'VIEW'"),
    ("SalesRecordController.java", "'Sales', 'VIEW'", "'Sales Entries', 'VIEW'"),
    
    # SystemController
    ("SystemController.java", "'Settings', 'BACKUP'", "'Settings', 'CREATE'"),
    ("SystemController.java", "'Settings', 'RESTORE'", "'Settings', 'EDIT'"),
    
    # SettingController
    ("SettingController.java", "'Settings', 'SETTINGS'", "'Settings', 'CREATE'")
]

for filename, old_str, new_str in replacements:
    filepath = os.path.join(base_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if old_str in content:
            content = content.replace(old_str, new_str)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Replaced {old_str} in {filename}")

# Fix CallingController manually since endpoints map to different modules
cc_path = os.path.join(base_dir, "CallingController.java")
with open(cc_path, 'r', encoding='utf-8') as f:
    cc_content = f.read()

# @GetMapping("/list") maps to Calling List
cc_content = cc_content.replace('@GetMapping("/list")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling\', \'VIEW\')")',
                                '@GetMapping("/list")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling List\', \'VIEW\')")')

# @PostMapping("/record") maps to Calling List
cc_content = cc_content.replace('@PostMapping("/record")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling\', \'CREATE\')")',
                                '@PostMapping("/record")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling List\', \'CREATE\')")')

# @DeleteMapping("/record/{id}") maps to Calling List
cc_content = cc_content.replace('@DeleteMapping("/record/{id}")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling\', \'DELETE\')")',
                                '@DeleteMapping("/record/{id}")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling List\', \'DELETE\')")')

# @GetMapping("/stats") maps to Calling Dashboard
cc_content = cc_content.replace('@GetMapping("/stats")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling\', \'VIEW\')")',
                                '@GetMapping("/stats")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling Dashboard\', \'VIEW\')")')

# @GetMapping("/reports") maps to Calling Reports
cc_content = cc_content.replace('@GetMapping("/reports")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling\', \'VIEW\')")',
                                '@GetMapping("/reports")\n    @PreAuthorize("@customPermissionEvaluator.hasAccess(authentication, \'Calling Reports\', \'VIEW\')")')

with open(cc_path, 'w', encoding='utf-8') as f:
    f.write(cc_content)
print("Updated CallingController.java")
