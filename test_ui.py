from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import sys

def run_test():
    print("Starting browser...")
    chrome_options = Options()
    chrome_options.add_experimental_option("detach", True)
    
    try:
        driver = webdriver.Chrome(executable_path=ChromeDriverManager().install(), options=chrome_options)
    except Exception as e:
        print("Failed to launch Chrome:", e)
        sys.exit(1)
        
    wait = WebDriverWait(driver, 10)

    try:
        # 1. Login
        print("Testing Login...")
        driver.get("http://localhost:8080/login.html")
        time.sleep(1)
        driver.find_element(By.ID, "username").send_keys("admin")
        driver.find_element(By.ID, "password").send_keys("admin")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        
        # 2. Verify Dashboard
        print("Verifying Dashboard...")
        wait.until(EC.url_contains("app.html"))
        time.sleep(2)
        
        # 3. Create Customer
        print("Testing Customer Creation...")
        driver.find_element(By.CSS_SELECTOR, "[data-target='customers']").click()
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(text(), 'Add Customer')]").click()
        time.sleep(1)
        driver.find_element(By.ID, "custName").send_keys("Test CEO Customer")
        driver.find_element(By.ID, "custContact").send_keys("9999999990")
        driver.find_element(By.ID, "custCity").send_keys("Mumbai")
        driver.find_element(By.ID, "btnSaveCustomer").click()
        time.sleep(2)
        
        # 4. Create Bill
        print("Testing Billing System...")
        driver.find_element(By.CSS_SELECTOR, "[data-target='billing']").click()
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(text(), 'New Bill')]").click()
        time.sleep(1)
        driver.find_element(By.ID, "billCustName").send_keys("Test CEO Customer")
        driver.find_element(By.ID, "billContact").send_keys("9999999990")
        driver.find_element(By.ID, "billCity").send_keys("Mumbai")
        driver.find_element(By.ID, "billTotal").send_keys("1500")
        driver.find_element(By.ID, "billNet").send_keys("1500")
        driver.find_element(By.ID, "billPaid").send_keys("500") # 1000 credit
        
        driver.find_element(By.ID, "btnSaveBill").click()
        time.sleep(2)
        
        # 5. Receive Payment
        print("Testing Receive Payment...")
        driver.find_element(By.CSS_SELECTOR, "[data-target='entries']").click()
        time.sleep(1)
        driver.find_element(By.XPATH, "//button[contains(text(), 'Add Record')]").click()
        time.sleep(1)
        
        # Select receive payment type
        receive_radio = driver.find_element(By.ID, "typeReceivePayment")
        driver.execute_script("arguments[0].click();", receive_radio)
        time.sleep(1)
        
        driver.find_element(By.ID, "customerName").send_keys("Test CEO Customer")
        driver.find_element(By.ID, "contactNumber").send_keys("9999999990")
        time.sleep(1)
        # click out to trigger blur
        driver.find_element(By.ID, "city").click()
        time.sleep(2)
        
        driver.find_element(By.ID, "paidAmount").send_keys("1000")
        driver.find_element(By.ID, "btnSaveRecord").click()
        
        time.sleep(3)
        print("Tests completed successfully! Browser is left open for your review.")
        
    except Exception as e:
        print("Test failed:", e)

if __name__ == "__main__":
    run_test()
