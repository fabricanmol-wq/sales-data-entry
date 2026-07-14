from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        errors = []
        page.on("pageerror", lambda err: errors.append(f"PageError: {err.message}"))
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type == 'error' else None)
        
        # Login
        page.goto("http://localhost:8080/index.html")
        page.fill("#loginForm input[name='username']", "Anmol0001")
        page.fill("#loginForm input[name='password']", "Anmol0001")
        page.click("#loginBtn")
        
        page.wait_for_url("http://localhost:8080/app.html")
        page.wait_for_load_state("networkidle")
        
        if errors:
            print("Errors found:")
            for e in errors:
                print(e)
        else:
            print("No browser console errors found on app.html")
            
        browser.close()

if __name__ == "__main__":
    run()
