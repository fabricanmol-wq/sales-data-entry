import re

def fix_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add autocapitalize="none" to username fields (if not already present)
    # Search for <input ... name="username" ...> or id="*Username"
    def username_replacer(match):
        tag = match.group(0)
        if 'autocapitalize' not in tag:
            return tag[:-1] + ' autocapitalize="none">'
        return tag

    content = re.sub(r'<input[^>]+name="username"[^>]*>', username_replacer, content)
    content = re.sub(r'<input[^>]+id="[^"]*Username"[^>]*>', username_replacer, content)

    # 2. Add autocapitalize="none" to password fields and wrap with toggle button
    # Only replace if not already wrapped (check if 'togglePassword' is in it)
    def password_replacer(match):
        tag = match.group(0)
        if 'autocapitalize' not in tag:
            tag = tag[:-1] + ' autocapitalize="none">'
            
        # extract id to create a unique toggle id
        id_match = re.search(r'id="([^"]+)"', tag)
        input_id = id_match.group(1) if id_match else "pwd_" + str(hash(tag))
        
        wrapper = f'''<div class="input-group toggle-password-group">
    {tag}
    <button class="btn btn-outline-secondary toggle-password-btn" type="button" data-target="{input_id}">
        <i class="bi bi-eye toggle-password-icon"></i>
    </button>
</div>'''
        return wrapper

    # We need to make sure we don't double wrap if run multiple times.
    if 'toggle-password-group' not in content:
        content = re.sub(r'<input[^>]+type="password"[^>]*>', password_replacer, content)
        
        # 3. Add JS snippet before </body>
        js_snippet = """
    <script>
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.toggle-password-btn');
            if (btn) {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = btn.querySelector('.toggle-password-icon');
                if (input && input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                } else if (input) {
                    input.type = 'password';
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
            }
        });
    </script>
</body>"""
        content = content.replace('</body>', js_snippet)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
fix_html('src/main/resources/static/app.html')
print("Fixed app.html")
