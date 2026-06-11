import puppeteer from 'puppeteer';
import fs from 'fs';

const screenshotDir = 'd:/antigravity/Eureka/Actividad1/artifacts/audit';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function run() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const routes = [
    { path: '/', name: 'executive_intelligence' },
    { path: '/dashboard', name: 'dashboard' },
    { path: '/copilot', name: 'copilot' },
    { path: '/explain', name: 'explainability' },
    { path: '/trace', name: 'traceability' },
    { path: '/influence', name: 'influence' },
    { path: '/graph', name: 'knowledge_graph' },
    { path: '/simulation', name: 'simulation' }
  ];

  for (const route of routes) {
    const url = `http://localhost:5173${route.path}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for React Query fetches and animations to finish
      await new Promise(r => setTimeout(r, 3000));
      
      // Special actions for pages if needed
      if (route.name === 'explainability' || route.name === 'traceability') {
        // Patient ID inputs might need a default value if they are blank.
        // Let's type Patient_5 into search input if present.
        try {
          const inputSelector = 'input[type="text"]';
          const buttonSelector = 'button';
          await page.waitForSelector(inputSelector, { timeout: 1000 });
          await page.focus(inputSelector);
          // clear input
          await page.keyboard.down('Control');
          await page.keyboard.press('KeyA');
          await page.keyboard.up('Control');
          await page.keyboard.press('Backspace');
          await page.type(inputSelector, 'Patient_5');
          await page.click(buttonSelector);
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.log("No input to prefill on " + route.name);
        }
      }
      
      if (route.name === 'influence') {
        // Prefill influence for DB
        try {
          const inputSelector = 'input[type="text"]';
          await page.waitForSelector(inputSelector, { timeout: 1000 });
          await page.type(inputSelector, 'DB');
          await page.keyboard.press('Enter');
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.log("No input on influence");
        }
      }

      const screenshotPath = `${screenshotDir}/${route.name}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot to ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed taking screenshot for ${route.name}:`, err);
    }
  }

  await browser.close();
  console.log("Screenshots capture done.");
}

run().catch(console.error);
