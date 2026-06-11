import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import waitOn from 'wait-on';
import fs from 'fs';

const screenshotDir = 'd:/antigravity/Eureka/Actividad1/artifacts/frontend';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function run() {
  console.log("Starting Vite dev server...");
  const viteProcess = exec('npm run dev', { cwd: 'd:/antigravity/Eureka/Actividad1/frontend' });

  viteProcess.stdout.on('data', data => console.log(data));
  viteProcess.stderr.on('data', data => console.error(data));

  console.log("Waiting for http://localhost:5173...");
  await waitOn({ resources: ['http-get://localhost:5173'] });

  console.log("Server is up. Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const routes = [
    { path: '/', name: 'dashboard' },
    { path: '/graph', name: 'graph' },
    { path: '/explain', name: 'explain' },
    { path: '/trace', name: 'trace' },
    { path: '/influence', name: 'influence' },
    { path: '/ingestion', name: 'ingestion' },
    { path: '/copilot', name: 'copilot' }
  ];

  for (const route of routes) {
    const url = `http://localhost:5173${route.path}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait an extra second for React Query and animations to finish
    await new Promise(r => setTimeout(r, 2000));
    
    const screenshotPath = `${screenshotDir}/${route.name}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot to ${screenshotPath}`);
  }

  await browser.close();
  viteProcess.kill();
  console.log("Done.");
}

run().catch(console.error);
