import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { scenarios, seedData, viewports } from './screenshot.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const buildRoot = path.join(root, 'dist');
const dist = existsSync(path.join(buildRoot, 'client')) ? path.join(buildRoot, 'client') : buildRoot;
const host = '127.0.0.1';
const port = Number(process.env.PORT || 4177);

const argv = process.argv.slice(2);
const flag = (name) => {
  const prefix = `--${name}=`;
  const match = argv.find((value) => value.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};
const positionalOut = argv.find((value) => !value.startsWith('--'));
const outDir = path.resolve(root, flag('out') || positionalOut || 'artifacts/screenshots');
const selectedViewportNames = (flag('viewports') || process.env.SCREENSHOT_VIEWPORTS || Object.keys(viewports).join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const selectedScenarioNames = (flag('scenarios') || process.env.SCREENSHOT_SCENARIOS || scenarios.map((scenario) => scenario.name).join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const fullPage = flag('full-page') === '1' || process.env.FULL_PAGE === '1';

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run npm run build before capture:screenshots.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
]);

function safeJoin(base, target) {
  const clean = decodeURIComponent(target.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const resolved = path.resolve(base, clean);
  if (!resolved.startsWith(base)) return path.join(base, 'index.html');
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    let filePath = safeJoin(dist, req.url || '/');
    if (!existsSync(filePath) || filePath.endsWith(path.sep)) filePath = path.join(dist, 'index.html');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
    res.end(data);
  } catch {
    const data = await readFile(path.join(dist, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  }
});

const listen = () => new Promise((resolve) => server.listen(port, host, resolve));
const stop = () => new Promise((resolve) => server.close(resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed(page, scenario) {
  await page.evaluateOnNewDocument((data, tasks) => {
    localStorage.setItem(data.tasksKey, JSON.stringify(tasks));
    localStorage.setItem(data.paramsKey, JSON.stringify({ ...data.params, ...data.paramsOverride }));
    if (data.settingsKey && data.settingsOverride) localStorage.setItem(data.settingsKey, JSON.stringify(data.settingsOverride));
  }, { ...seedData, paramsOverride: scenario.seedParams ?? {}, settingsOverride: scenario.seedSettings ?? null }, scenario.seedTasks ?? seedData.tasks);
}

async function visibleHandles(page, selector) {
  const handles = await page.$$(selector);
  const visible = [];
  for (const handle of handles) {
    const isVisible = await handle.evaluate((node) => {
      const element = node;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    if (isVisible) visible.push(handle);
  }
  return visible;
}

async function clickFirstVisible(page, selector, optional = false) {
  const selectors = selector.split(',').map((item) => item.trim()).filter(Boolean);
  for (const item of selectors) {
    const visible = await visibleHandles(page, item);
    if (visible[0]) {
      await visible[0].click();
      return true;
    }
  }
  if (!optional) throw new Error(`No visible element for selector: ${selector}`);
  return false;
}

async function openTab(page, tab) {
  const direct = await clickFirstVisible(page, `[data-workspace-navigation] [data-workspace-tab="${tab}"], [data-testid="sidebar-rail"] [data-workspace-tab="${tab}"], .sidebar-rail [data-workspace-tab="${tab}"]`, true);
  if (direct) return;
  await clickFirstVisible(page, '[data-testid="mobile-drawer-trigger"]');
  await page.waitForSelector('[data-testid="mobile-sidebar-drawer"][data-open="true"], .mobile-sidebar-drawer.open');
  await clickFirstVisible(page, `[data-testid="mobile-sidebar-drawer"] [data-workspace-tab="${tab}"], .mobile-sidebar-drawer [data-workspace-tab="${tab}"]`);
  await page.waitForFunction(() => !document.querySelector('[data-testid="mobile-drawer-backdrop"][data-open="true"], .mobile-drawer-backdrop.open'), { timeout: 4000 }).catch(() => {});
}

async function screenshot(page, viewportName, scenarioName) {
  await page.screenshot({ path: path.join(outDir, `${viewportName}-${scenarioName}.png`), fullPage });
}

async function runStep(page, step, viewportName, scenarioName) {
  if (step.type === 'wait') await wait(step.ms ?? 150);
  if (step.type === 'waitForSelector') await page.waitForSelector(step.selector, { timeout: step.timeout ?? 12000 });
  if (step.type === 'click') await clickFirstVisible(page, step.selector, Boolean(step.optional));
  if (step.type === 'openTab') await openTab(page, step.tab);
  if (step.type === 'scroll') await page.evaluate((y) => window.scrollTo(0, y), step.y ?? 0);
  if (step.type === 'clearTasks') {
    await page.evaluate((key) => localStorage.setItem(key, '[]'), seedData.tasksKey);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(step.waitMs ?? 450);
    await page.waitForSelector('.studio-app, [data-testid="detail-page"]');
  }
  if (step.type === 'closeModal') {
    await page.evaluate((selector) => document.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true })), step.selector).catch(() => {});
    await wait(160);
  }
  if (step.type === 'keyboard') await page.keyboard.press(step.key);
  if (step.type === 'upload') {
    const input = await page.$(step.selector);
    if (!input) throw new Error(`No input element for upload selector: ${step.selector}`);
    const files = Array.isArray(step.files) ? step.files : [step.file];
    await input.uploadFile(...files.map((file) => path.resolve(root, file)));
  }
  if (step.type === 'screenshot') await screenshot(page, viewportName, scenarioName);
}

async function bootPage(browser, viewportName, scenario) {
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(15000);
    const viewport = viewports[viewportName];
    await page.setViewport(viewport);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) request.abort();
      else request.continue();
    });
    await seed(page, scenario);
    await page.goto(`http://${host}:${port}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await wait(450);
    await page.waitForSelector('.studio-app, [data-testid="detail-page"]');
    return page;
  } catch (error) {
    await page.close().catch(() => {});
    throw error;
  }
}

function isRecoverableCaptureError(error) {
  const message = `${String(error?.message || error)} ${String(error?.cause?.message || '')}`;
  return /detached Frame|Attempted to use detached Frame|frame got detached|Navigating frame was detached|Target closed|Session closed|Connection closed/i.test(message);
}

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none', '--proxy-server=direct://', '--proxy-bypass-list=*', '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights']
  });
}

async function captureScenario(viewportName, scenario) {
  const attempts = Number(process.env.SCREENSHOT_CAPTURE_ATTEMPTS || 3);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let browser;
    let page;
    try {
      browser = await launchBrowser();
      page = await bootPage(browser, viewportName, scenario);
      for (const step of scenario.steps) await runStep(page, step, viewportName, scenario.name);
      return;
    } catch (error) {
      await page?.close().catch(() => {});
      await browser?.close().catch(() => {});
      if (attempt >= attempts || !isRecoverableCaptureError(error)) throw error;
      console.warn(`Retrying screenshot ${viewportName}/${scenario.name} after recoverable browser error (${attempt}/${attempts})`);
      await wait(300);
    } finally {
      await page?.close().catch(() => {});
      await browser?.close().catch(() => {});
    }
  }
}

const unknownViewports = selectedViewportNames.filter((viewportName) => !viewports[viewportName]);
if (unknownViewports.length) {
  console.error(`Unknown viewport(s): ${unknownViewports.join(', ')}. Available: ${Object.keys(viewports).join(', ')}`);
  process.exit(1);
}

const scenarioByName = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
const unknownScenarios = selectedScenarioNames.filter((scenarioName) => !scenarioByName.has(scenarioName));
if (unknownScenarios.length) {
  console.error(`Unknown scenario(s): ${unknownScenarios.join(', ')}. Available: ${scenarios.map((item) => item.name).join(', ')}`);
  process.exit(1);
}

const failures = [];
const completed = [];

await listen();
try {
  for (const viewportName of selectedViewportNames) {
    for (const scenarioName of selectedScenarioNames) {
      const scenario = scenarioByName.get(scenarioName);
      console.log(`Capturing ${viewportName}/${scenario.name}...`);
      try {
        await captureScenario(viewportName, scenario);
        completed.push(`${viewportName}/${scenario.name}`);
        console.log(`Captured ${viewportName}/${scenario.name}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ viewportName, scenarioName: scenario.name, message });
        console.error(`Failed ${viewportName}/${scenario.name}: ${message}`);
      }
    }
  }

  console.log(`Screenshots saved to ${outDir}`);
  console.log(`Screenshot capture summary: ${completed.length} completed, ${failures.length} failed.`);
  if (failures.length) {
    console.error('Failed screenshot scenarios:');
    failures.forEach((failure) => console.error(`  - ${failure.viewportName}/${failure.scenarioName}: ${failure.message}`));
    process.exitCode = 1;
  }
} finally {
  await stop();
}
