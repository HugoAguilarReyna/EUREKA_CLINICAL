const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const pages = [
    { name: 'dashboard', url: 'http://localhost:5173/dashboard' },
    { name: 'executive_console', url: 'http://localhost:5173/executive-console' },
    { name: 'graph', url: 'http://localhost:5173/graph' },
    { name: 'copilot', url: 'http://localhost:5173/copilot' }
  ];
  
  const resolutions = [
    { width: 1920, height: 1080, name: '1080p' },
    { width: 1366, height: 768, name: '768p' }
  ];

  for (const pageInfo of pages) {
    const page = await browser.newPage();
    
    for (const res of resolutions) {
      await page.setViewport({ width: res.width, height: res.height });
      console.log(`Navigating to ${pageInfo.url} at ${res.width}x${res.height}...`);
      
      try {
        await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait a bit extra for React rendering and backend fetching
        await new Promise(r => setTimeout(r, 2000));
        
        const screenshotPath = `C:\\Users\\aguil\\.gemini\\antigravity\\brain\\aaca331b-f567-4d86-badb-342963f3bffe\\scratch\\${pageInfo.name}_${res.name}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved screenshot: ${screenshotPath}`);
      } catch (e) {
        console.error(`Failed to capture ${pageInfo.url} at ${res.name}:`, e.message);
      }
    }
    await page.close();
  }

  await browser.close();
})();
