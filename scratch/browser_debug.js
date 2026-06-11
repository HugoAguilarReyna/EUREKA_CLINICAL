import puppeteer from 'puppeteer';
import fs from 'fs';

const screenshotDir = 'd:/antigravity/Eureka/Actividad1/artifacts/debug';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function debug() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Capture console logs
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', err => {
    console.error(`[Browser Error]: ${err.message}`);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.error(`[Network Failure]: ${request.url()} - ${request.failure().errorText}`);
  });

  const routes = [
    { path: '/', name: 'dashboard' },
    { path: '/explain', name: 'explain' },
    { path: '/trace', name: 'trace' },
    { path: '/graph', name: 'graph' }
  ];

  for (const route of routes) {
    const url = `http://localhost:5180${route.path}`;
    console.log(`\nNavigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Wait for any React rendering/queries
      await new Promise(r => setTimeout(r, 4000));
      
      const screenshotPath = `${screenshotDir}/${route.name}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed to navigate to ${url}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("\nDebug finished.");
}

debug().catch(console.error);
