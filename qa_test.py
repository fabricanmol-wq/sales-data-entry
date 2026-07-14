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
        # Get all clickable tabs or buttons that change views.
        # It looks like the app uses tabs with class 'tab-pane' or something. Let's just click all buttons and elements with 'onclick' or inside a sidebar.
        # Actually, let's look at what the sidebar items are.
        # For this test, let's just evaluate JS to find all elements that call switchView() or showSection().
        sidebar_items = page.locator(".list-group-item").all()
        for i, item in enumerate(sidebar_items):
            try:
                text = item.inner_text()
                print(f"Clicking sidebar item: {text}")
                item.click(force=True)
                page.wait_for_timeout(1000) # wait for render and api calls
            except Exception as e:
                print(f"Could not click item: {e}")
                
        # Also let's click all buttons inside the visible sections (excluding Save/Submit to avoid polluting DB initially, or just test loading modals)
        # Let's check the modals:
        modals_btn = page.locator("button[data-bs-toggle='modal']").all()
        for btn in modals_btn:
            try:
                if btn.is_visible():
                    text = btn.inner_text().strip()
                    print(f"Opening Modal: {text}")
                    btn.click(force=True)
                    page.wait_for_timeout(500)
                    
                    # Close modal
                    close_btns = page.locator(".btn-close:visible").all()
                    if close_btns:
                        close_btns[0].click(force=True)
                        page.wait_for_timeout(500)
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
