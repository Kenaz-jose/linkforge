const { chromium } = require('playwright');

(async () => {
  console.log("Starting browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message, err.stack));

  console.log("Navigating to frontend...");
  await page.goto('http://localhost:5173');
  
  console.log("Waiting for Category...");
  await page.waitForSelector('button:has-text("Quantum Mechanics")');
  await page.click('button:has-text("Quantum Mechanics")');
  
  console.log("Waiting for Start button...");
  await page.waitForSelector('button:has-text("Start")');
  await page.click('button:has-text("Start")');
  
  console.log("Waiting a bit for transition...");
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
