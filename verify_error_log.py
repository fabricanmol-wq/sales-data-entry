import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        
        print("Logging in...")
        page.goto("http://localhost:8080/index.html")
        page.fill("#loginForm input[name='username']", "Anmol0001")
        page.fill("#loginForm input[name='password']", "Anmol0001")
        page.click("#loginBtn")
        
        page.wait_for_url("http://localhost:8080/app.html", timeout=10000)
        page.wait_for_load_state("networkidle")
        
        print("Generating a test JS error...")
        # Define sendErrorLog interceptor
        page.evaluate("""
            const oldSend = window.sendErrorLog;
            window.sendErrorLog = function(msg, stack) {
                console.log("SENDING ERROR LOG: " + msg);
                oldSend(msg, stack);
            }
        """)
        
        page.evaluate("setTimeout(() => { throw new Error('Test Audit Log Error from Playwright'); }, 100);")
        
        # Wait a moment for the tracker to send the log to the backend
        page.wait_for_timeout(2000)
        
        print("Clicking 'System Logs'...")
        # Find the sidebar item that targets 'errorLogs'
        page.locator("a[data-target='errorLogs']").click(force=True)
        page.wait_for_timeout(2000)
        
        print("Checking Error Logs Table...")
        logs = page.locator("#errorLogsTable tbody tr").all()
        print(f"Found {len(logs)} error logs in table.")
        for row in logs:
            print(" -> ", row.inner_text().replace('\n', ' | '))
            
        browser.close()

if __name__ == "__main__":
    run()
