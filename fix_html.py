import re

with open('src/main/resources/static/app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of the authorized signatory div which is where the duplication started
# Specifically, we look for '<strong id="invSignatory">Authorized Signatory</strong>'
match = re.search(r'<strong id="invSignatory">Authorized Signatory</strong>\s*</div>\s*</div>\s*</div>\s*</div>', content)

if match:
    cleaned = content[:match.end()] + '''

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="/assets/js/app.js?v=1005"></script>
</body>
</html>
'''
    with open('src/main/resources/static/app.html', 'w', encoding='utf-8') as f:
        f.write(cleaned)
    print("Fixed app.html")
else:
    print("Could not find the end marker")
