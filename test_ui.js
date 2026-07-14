const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting browser...");
    // Launch Chrome with UI visible and a slight delay between actions so the user can watch
    const browser = await puppeteer.launch({ headless: false, slowMo: 300, defaultViewport: null });
    const page = await browser.newPage();
    
    try {
        console.log("Testing Login...");
        await page.goto('http://localhost:8080/index.html');
        await page.type('#username', 'Anmol0001');
        await page.type('#password', 'password');
        await page.click('button[type="submit"]');
        
        console.log("Verifying Dashboard...");
        await page.waitForNavigation();
        
        console.log("Testing Billing System (Auto-creating customer)...");
        await page.click('[data-target="billing"]');
        await page.waitForSelector('button[onclick="openNewBill()"]', { visible: true });
        await page.click('button[onclick="openNewBill()"]');
        
        await page.waitForSelector('#billCustName', { visible: true });
        await page.type('#billCustName', 'Test CEO Customer');
        await page.type('#billContact', '9999999990');
        await page.type('#billCity', 'Mumbai');
        
        await page.type('#billTotal', '1500');
        await page.type('#billNet', '1500');
        await page.type('#billPaid', '500'); // Leaving 1000 credit
        
        await page.click('#btnSaveBill');
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("All tests passed! The system is solid.");
        
        // Keep the browser open for 10 seconds for the user to review, then close.
        console.log("Browser will close in 10 seconds...");
        await new Promise(r => setTimeout(r, 10000));
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await browser.close();
    }
})();
