import re
with open("src/main/resources/static/assets/js/app.js", "r", encoding="utf-8") as f:
    content = f.read()

escape_fn = """function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

"""
content = escape_fn + content

vars_to_escape = ["c.customerName", "c.city", "c.contactNumber", "r.customerName", "r.city", "r.contactNumber", "r.remarks", "b.customerName", "b.city", "b.contactNumber"]
for v in vars_to_escape:
    content = re.sub(r"\$\{\s*" + v.replace(".", "\\.") + r"\s*(?:\|\|\s*\'\')?\s*\}", r"${escapeHTML(" + v + r")}", content)

with open("src/main/resources/static/assets/js/app.js", "w", encoding="utf-8") as f:
    f.write(content)
