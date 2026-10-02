import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForSelector('textarea');
  await page.type('textarea', 'Test topic');
  
  await page.click('button:last-of-type');
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
