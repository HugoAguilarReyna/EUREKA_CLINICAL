const puppeteer = require('puppeteer');

(async () => {
  try {
    const url = 'https://eureka-frontend-210a.onrender.com/#/decision-os';
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const consoleErrors = [];
    
    page.on('pageerror', err => {
      consoleErrors.push('PAGE_ERROR: ' + err.toString());
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push('CONSOLE_ERROR: ' + msg.text());
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // wait for dynamic render
    await new Promise(r => setTimeout(r, 5000));
    
    console.log(JSON.stringify(consoleErrors, null, 2));
    await browser.close();
  } catch(e) {
    console.error('SCRIPT_ERROR', e);
  }
})();
