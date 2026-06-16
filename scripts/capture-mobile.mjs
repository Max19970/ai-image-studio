import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const buildRoot = path.join(root, 'dist');
const dist = existsSync(path.join(buildRoot, 'client')) ? path.join(buildRoot, 'client') : buildRoot;
const outDir = path.resolve(root, process.argv[2] || 'artifacts/mobile-screenshots');
const port = Number(process.env.PORT || 4177);
const host = '127.0.0.1';

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run npm run build before capture:mobile.');
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

function listen() {
  return new Promise((resolve) => server.listen(port, host, resolve));
}

function stop() {
  return new Promise((resolve) => server.close(resolve));
}

const sampleImage = (seed) => {
  const hue = seed * 57;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,72%)"/><stop offset="0.55" stop-color="hsl(${hue + 72},54%,34%)"/><stop offset="1" stop-color="hsl(${hue + 140},78%,18%)"/></linearGradient><radialGradient id="r" cx=".62" cy=".3" r=".6"><stop offset="0" stop-color="rgba(255,255,255,.82)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient></defs><rect width="900" height="1200" fill="url(#g)"/><circle cx="650" cy="240" r="330" fill="url(#r)"/><path d="M90 880 C220 520 460 460 810 250" fill="none" stroke="rgba(255,255,255,.48)" stroke-width="44" stroke-linecap="round"/><path d="M120 990 C290 720 470 680 760 560" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="60" stroke-linecap="round"/><text x="80" y="1120" fill="rgba(255,255,255,.78)" font-family="Arial" font-size="72" font-weight="700">Sample ${seed}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const now = Date.now();
const request = {
  createdAt: now,
  mode: 'generate',
  prompt: 'Mobile screenshot sample prompt',
  endpoint: 'https://api.openai.com/v1/images/generations',
  providerLabel: 'OpenAI',
  model: 'gpt-image-2',
  modelLabel: 'GPT Image 2',
  payload: { model: 'gpt-image-2', prompt: 'Mobile screenshot sample prompt', n: 1, size: '1024x1536' },
  warnings: [],
  attachments: [],
  params: { n: 1, sizeMode: 'preset', sizePreset: '1024x1536', width: 1024, height: 1536, quality: 'auto', background: 'auto', moderation: 'auto', outputFormat: 'png', outputCompression: 100, stream: false, partialImages: 0, inputFidelity: '', style: '', retryAttempts: 1, retryDelaySeconds: 10 }
};
const sampleTasks = Array.from({ length: 12 }, (_, i) => ({
  id: `sample-task-${i}`,
  kind: i === 3 ? 'batch' : 'single',
  status: i === 1 ? 'failed' : i === 2 ? 'streaming' : 'succeeded',
  createdAt: now - i * 450000,
  updatedAt: now - i * 320000,
  request,
  images: i === 1 ? [] : [{ id: `sample-image-${i}`, taskId: `sample-task-${i}`, src: sampleImage(i + 1), format: 'png', kind: 'final', index: i, createdAt: now - i * 450000, request }],
  error: i === 1 ? 'Synthetic failed request for layout testing.' : null,
  batch: i === 3 ? { intervalMs: 4000, items: [] } : undefined
}));

async function seed(page) {
  await page.evaluateOnNewDocument((tasks) => {
    localStorage.setItem('image-studio.generation-tasks.v1', JSON.stringify(tasks));
    localStorage.setItem('gpt-image-2-studio.params.v2', JSON.stringify({
      prompt: '', n: 1, sizeMode: 'preset', sizePreset: '1024x1024', width: 1024, height: 1024,
      quality: 'auto', background: 'auto', moderation: 'auto', outputFormat: 'png', outputCompression: 100,
      stream: false, partialImages: 0, responseFormat: '', inputFidelity: '', user: '', style: '',
      retryAttempts: 1, retryDelaySeconds: 10, rawJson: '', includeModel: true, includeN: true,
      includeQuality: true, includeBackground: true, includeModeration: true, includeOutputFormat: true,
      includeOutputCompression: false, includeStream: false, includePartialImages: false,
      includeResponseFormat: false, includeInputFidelity: false, includeUser: false, includeStyle: false
    }));
  }, sampleTasks);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: process.env.FULL_PAGE === '1' });
}

await listen();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
      request.abort();
    } else {
      request.continue();
    }
  });
  await seed(page);
  await page.goto(`http://${host}:${port}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.waitForSelector('.studio-app, .detail-page');
  await screenshot(page, '01-gallery');

  const composerButtons = await page.$$('.composer-icon-button');
  if (composerButtons[1]) {
    await composerButtons[1].click();
    await new Promise((resolve) => setTimeout(resolve, 220));
    await screenshot(page, '01b-composer-assets');
    await page.keyboard.press('Escape').catch(() => {});
  }
  if (composerButtons[3]) {
    await composerButtons[3].click();
    await page.waitForSelector('.parameters-modal-shell');
    await new Promise((resolve) => setTimeout(resolve, 220));
    await screenshot(page, '01c-parameters-modal');
    await page.evaluate(() => document.querySelector('.parameters-modal-shell .icon-button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('.parameters-modal-shell'), { timeout: 4000 }).catch(() => {});
  }

  const batchButtons = await page.$$('.composer-icon-button');
  if (batchButtons[2]) {
    await batchButtons[2].click();
    await page.waitForSelector('.batch-composer-stage');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await screenshot(page, '01d-batch-composer');
    await page.click('.batch-composer-footer .btn-secondary').catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 180));
    await screenshot(page, '01e-batch-composer-two-requests');
    await page.evaluate(() => window.scrollTo(0, 360));
    await new Promise((resolve) => setTimeout(resolve, 160));
    await screenshot(page, '01f-batch-composer-scrolled');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('.batch-composer-topbar > .btn-secondary').catch(() => {});
    await page.waitForSelector('.gallery-stage');
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  await page.click('.mobile-drawer-trigger');
  await page.waitForSelector('.mobile-sidebar-drawer.open');
  await screenshot(page, '02-drawer');

  const drawerButtons = await page.$$('.mobile-sidebar-tabs button');
  if (drawerButtons[2]) await drawerButtons[2].click();
  await page.waitForSelector('.workspace-settings-page');
  await new Promise((resolve) => setTimeout(resolve, 250));
  await screenshot(page, '03-settings-api');

  await page.click('.mobile-api-switch button:nth-child(2)').catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 200));
  await screenshot(page, '03b-settings-models');
  await page.click('.mobile-api-switch button:nth-child(1)').catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 120));

  await page.click('.settings-mobile-tabs button:nth-child(1)').catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 250));
  await screenshot(page, '04-settings-interface');

  await page.click('.mobile-drawer-trigger');
  await page.waitForSelector('.mobile-sidebar-drawer.open');
  const drawerButtons2 = await page.$$('.mobile-sidebar-tabs button');
  if (drawerButtons2[1]) await drawerButtons2[1].click();
  await page.waitForSelector('.workspace-info-page');
  await page.waitForFunction(() => !document.querySelector('.mobile-drawer-backdrop.open'), { timeout: 4000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 250));
  await screenshot(page, '05-info');

  await page.click('.mobile-drawer-trigger');
  await page.waitForSelector('.mobile-sidebar-drawer.open');
  const drawerButtons3 = await page.$$('.mobile-sidebar-tabs button');
  if (drawerButtons3[0]) await drawerButtons3[0].click();
  await page.waitForFunction(() => !document.querySelector('.mobile-drawer-backdrop.open'), { timeout: 4000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 180));
  await page.waitForSelector('.gallery-card');
  await page.click('.gallery-card button');
  await page.waitForSelector('.detail-page');
  await screenshot(page, '06-detail');

  console.log(`Mobile screenshots saved to ${outDir}`);
} finally {
  await browser.close();
  await stop();
}
