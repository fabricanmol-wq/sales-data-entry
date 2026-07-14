import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        errors = []
        api_errors = []

        page.on("pageerror", lambda err: errors.append(f"JS Error: {err.message}"))
        
        def handle_response(response):
            if response.status >= 400:
                api_errors.append(f"API Error: {response.status} {response.url}")
        
        page.on("response", handle_response)
        
        print("Logging in...")
        page.goto("http://localhost:8080/index.html")
        page.fill("#loginForm input[name='username']", "Anmol0001")
        page.fill("#loginForm input[name='password']", "Anmol0001")
        page.click("#loginBtn")
        
        page.wait_for_url("http://localhost:8080/app.html", timeout=10000)
        page.wait_for_load_state("networkidle")
        
        print("Scraping tabs/menus...")
        sidebar_items = page.locator(".list-group-item").all()
        for item in sidebar_items:
            try:
                text = item.inner_text().strip()
                if "Logout" in text:
                    continue # Skip logout
                print(f"Clicking sidebar item: {text}")
                item.click(force=True)
                page.wait_for_timeout(500)
            except Exception as e:
                pass
                
        # Now click all buttons (like 'Add Customer', 'Add Salesman', 'Edit', etc) that toggle modals.
        print("Checking Modals...")
        modals_btn = page.locator("button[data-bs-toggle='modal'], a[data-bs-toggle='modal']").all()
        for btn in modals_btn:
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip() or btn.get_attribute("title") or "Button"
                    print(f"Opening Modal via: {text}")
                    btn.click(force=True)
                    page.wait_for_timeout(500)
                    
                    close_btns = page.locator(".modal.show .btn-close").all()
                    for close_btn in close_btns:
                        if close_btn.is_visible():
                            close_btn.click(force=True)
                            page.wait_for_timeout(300)
            except Exception as e:
                pass
                
        print("\n--- RESULTS ---")
        if not errors and not api_errors:
            print("All clear! No errors found.")
        else:
            if errors:
                print("JS Errors:")
                for e in set(errors):
                    print("  " + e)
            if api_errors:
                print("API Errors:")
                for e in set(api_errors):
                    print("  " + e)
                    
        browser.close()

if __name__ == "__main__":
    run()
