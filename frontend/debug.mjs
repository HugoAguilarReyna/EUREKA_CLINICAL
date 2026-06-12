import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/#/dashboard', { waitUntil: 'networkidle0' });
  
  // Get the HTML content
  const html = await page.content();
  fs.writeFileSync('page_snapshot.html', html);
  
  // Check specifically if sliders exist
  const sliderCount = await page.$$eval('input[type="range"]', els => els.length);
  console.log('SLIDER COUNT:', sliderCount);
  
  const textContent = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync('page_text.txt', textContent);
  
  await browser.close();
})();
