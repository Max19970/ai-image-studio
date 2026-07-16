#!/usr/bin/env node
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { seedData } from './screenshot.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const buildRoot = path.join(root, 'dist');
const dist = existsSync(path.join(buildRoot, 'client')) ? path.join(buildRoot, 'client') : buildRoot;
const host = '127.0.0.1';
const port = Number(process.env.SHELL_CHECK_PORT || 4191);
const desktopWidths = [861, 900, 1000, 1100, 1180, 1440];
const epsilon = 1.25;

function resolveBrowserExecutable() {
  const configured = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured) return configured;
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ]
    : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  return candidates.find((candidate) => candidate && existsSync(candidate)) || candidates[0];
}

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
  return resolved.startsWith(base) ? resolved : path.join(base, 'index.html');
}

const server = http.createServer(async (request, response) => {
  try {
    let filePath = safeJoin(dist, request.url || '/');
    if (!existsSync(filePath) || filePath.endsWith(path.sep)) filePath = path.join(dist, 'index.html');
    const data = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream' });
    response.end(data);
  } catch {
    const data = await readFile(path.join(dist, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(data);
  }
});

function apiMock(request) {
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const json = (body, status = 200) => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });

  if (url.pathname === '/api/storage/generation-tasks') {
    if (method === 'GET') return json({ tasks: seedData.tasks, storage: { backend: 'shell-check', schemaVersion: 1, dbPath: 'shell-check' } });
    return json({ ok: true, storage: { backend: 'shell-check', schemaVersion: 1, dbPath: 'shell-check' } });
  }
  if (url.pathname === '/api/storage/generation-task-asset') return json({ image: null });
  if (url.pathname === '/api/generation-tasks/events') return { status: 204, contentType: 'text/plain; charset=utf-8', body: '' };
  if (url.pathname === '/api/integrations') return json({ integrations: [] });
  if (url.pathname.startsWith('/api/')) return json({});
  return null;
}

function closeEnough(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)}`);
}

async function readGeometry(page) {
  return page.evaluate(() => {
    const rail = document.querySelector('[data-testid="sidebar-rail"]');
    const main = document.querySelector('.studio-main');
    const dock = document.querySelector('[data-testid="composer-dock"]');
    if (!(rail instanceof HTMLElement) || !(main instanceof HTMLElement) || !(dock instanceof HTMLElement)) {
      throw new Error('Workspace shell elements are missing.');
    }
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const app = document.querySelector('.studio-app');
    return {
      rail: rect(rail),
      main: rect(main),
      dock: rect(dock),
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      appScrollWidth: app instanceof HTMLElement ? app.scrollWidth : 0
    };
  });
}

function assertGeometry(geometry, label) {
  closeEnough(geometry.rail.right, geometry.main.left, `${label}: sidebar/main seam`);
  closeEnough(geometry.main.right, geometry.viewportWidth, `${label}: main reaches viewport edge`);
  assert.ok(geometry.dock.left >= geometry.main.left - epsilon, `${label}: dock escaped left of main`);
  assert.ok(geometry.dock.right <= geometry.main.right + epsilon, `${label}: dock escaped right of main`);
  assert.ok(geometry.documentScrollWidth <= geometry.viewportWidth + epsilon, `${label}: document overflowed horizontally (${geometry.documentScrollWidth} > ${geometry.viewportWidth})`);
  assert.ok(geometry.appScrollWidth <= geometry.viewportWidth + epsilon, `${label}: app overflowed horizontally (${geometry.appScrollWidth} > ${geometry.viewportWidth})`);
}

async function seed(page) {
  await page.evaluateOnNewDocument((data) => {
    localStorage.setItem(data.tasksKey, JSON.stringify(data.tasks));
    localStorage.setItem(data.paramsKey, JSON.stringify(data.params));
  }, seedData);
}

async function bootPage(browser, width) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const mock = apiMock(request);
    if (mock) return void request.respond(mock);
    const url = request.url();
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return void request.abort();
    return void request.continue();
  });
  await seed(page);
  await page.goto(`http://${host}:${port}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('[data-testid="sidebar-rail"]');
  await page.waitForSelector('[data-testid="composer-dock"]');
  await new Promise((resolve) => setTimeout(resolve, 350));
  return page;
}

async function verifyWidth(browser, width) {
  const page = await bootPage(browser, width);
  try {
    const initialGeometry = await readGeometry(page);
    assertGeometry(initialGeometry, `${width}px expanded`);
    const expectedDefaultSize = width <= 1180 ? 248 : Math.min(272, Math.max(252, Math.round(width * .18)));
    closeEnough(initialGeometry.rail.width, expectedDefaultSize, `${width}px default sidebar size`);

    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="sidebar-collapse"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Sidebar collapse button is missing.');
      button.click();
    });
    for (const elapsed of [0, 32, 80, 160, 280]) {
      if (elapsed) await new Promise((resolve) => setTimeout(resolve, elapsed === 32 ? 32 : elapsed - [0, 32, 80, 160, 280][[0, 32, 80, 160, 280].indexOf(elapsed) - 1]));
      assertGeometry(await readGeometry(page), `${width}px collapse +${elapsed}ms`);
    }

    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="sidebar-expand"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Sidebar expand button is missing.');
      button.click();
    });
    for (const elapsed of [0, 32, 80, 160, 280]) {
      if (elapsed) await new Promise((resolve) => setTimeout(resolve, elapsed === 32 ? 32 : elapsed - [0, 32, 80, 160, 280][[0, 32, 80, 160, 280].indexOf(elapsed) - 1]));
      assertGeometry(await readGeometry(page), `${width}px expand +${elapsed}ms`);
    }
  } finally {
    await page.close();
  }
}

async function verifyResizableSidebar(browser) {
  const page = await bootPage(browser, 1440);
  try {
    const before = await readGeometry(page);
    const handle = await page.waitForSelector('[data-testid="sidebar-resize-handle"]');
    if (!handle) throw new Error('Sidebar resize handle is missing.');
    const box = await handle.boundingBox();
    if (!box) throw new Error('Sidebar resize handle has no bounding box.');

    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 160));
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + Math.min(box.height / 2, 160), { steps: 8 });
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 80));

    const resized = await readGeometry(page);
    assertGeometry(resized, '1440px resized');
    assert.ok(resized.rail.width >= before.rail.width + 100, `Resize did not grow sidebar enough (${before.rail.width} -> ${resized.rail.width}).`);

    await page.evaluate(() => document.querySelector('[data-testid="sidebar-collapse"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await new Promise((resolve) => setTimeout(resolve, 300));
    assertGeometry(await readGeometry(page), '1440px resized collapsed');
    await page.evaluate(() => document.querySelector('[data-testid="sidebar-expand"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await new Promise((resolve) => setTimeout(resolve, 300));

    const restored = await readGeometry(page);
    assertGeometry(restored, '1440px resized restored');
    closeEnough(restored.rail.width, resized.rail.width, 'Expanded sidebar restores resized width');

    await page.focus('[data-testid="sidebar-resize-handle"]');
    await page.keyboard.press('ArrowLeft');
    await new Promise((resolve) => setTimeout(resolve, 280));
    const keyboardResized = await readGeometry(page);
    assertGeometry(keyboardResized, '1440px keyboard resized');
    assert.ok(keyboardResized.rail.width < restored.rail.width, 'ArrowLeft did not reduce sidebar width.');

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('[data-testid="sidebar-resize-handle"]');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const persisted = await readGeometry(page);
    assertGeometry(persisted, '1440px persisted resize');
    closeEnough(persisted.rail.width, keyboardResized.rail.width, 'Sidebar width persists after reload');

    await page.evaluate(() => {
      const handle = document.querySelector('[data-testid="sidebar-resize-handle"]');
      if (!(handle instanceof HTMLElement)) throw new Error('Sidebar resize handle is missing after reload.');
      handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reset = await readGeometry(page);
    assertGeometry(reset, '1440px reset resize');
    closeEnough(reset.rail.width, 259, 'Double-click restores default sidebar width');
    const storedValue = await page.evaluate(() => localStorage.getItem('imageStudio.workspace.sidebarSize'));
    assert.equal(storedValue, null, 'Double-click reset should clear persisted sidebar width.');
  } finally {
    await page.close();
  }
}

async function verifyNarrowMainPages(browser) {
  const page = await bootPage(browser, 900);
  try {
    await page.focus('[data-testid="sidebar-resize-handle"]');
    await page.keyboard.press('End');
    await new Promise((resolve) => setTimeout(resolve, 300));

    for (const tab of ['images', 'info', 'settings']) {
      await page.evaluate((workspaceTab) => {
        const button = document.querySelector(`[data-workspace-tab="${workspaceTab}"]`);
        if (!(button instanceof HTMLButtonElement)) throw new Error(`Workspace tab is missing: ${workspaceTab}`);
        button.click();
      }, tab);
      await new Promise((resolve) => setTimeout(resolve, 250));
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('.studio-main');
        if (!(main instanceof HTMLElement)) throw new Error('Workspace main is missing.');
        const mainRect = main.getBoundingClientRect();
        const offenders = Array.from(main.querySelectorAll('*'))
          .filter((element) => element instanceof HTMLElement)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              className: element.className,
              testId: element.dataset.testid ?? null,
              width: Math.round(rect.width),
              rightOverflow: Math.round(Math.max(0, rect.right - mainRect.right)),
              scrollOverflow: Math.max(0, element.scrollWidth - element.clientWidth)
            };
          })
          .filter((item) => item.rightOverflow > 1 || item.scrollOverflow > 1)
          .sort((a, b) => Math.max(b.rightOverflow, b.scrollOverflow) - Math.max(a.rightOverflow, a.scrollOverflow))
          .slice(0, 8);
        return {
          clientWidth: main.clientWidth,
          scrollWidth: main.scrollWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          offenders
        };
      });
      assert.ok(
        overflow.scrollWidth <= overflow.clientWidth + epsilon,
        `${tab}: main content overflowed horizontally (${overflow.scrollWidth} > ${overflow.clientWidth}). Offenders: ${JSON.stringify(overflow.offenders)}`
      );
      assert.ok(overflow.documentScrollWidth <= overflow.viewportWidth + epsilon, `${tab}: document overflowed horizontally (${overflow.documentScrollWidth} > ${overflow.viewportWidth}).`);
    }
  } finally {
    await page.close();
  }
}

async function verifyNarrowMainWorkflows(browser) {
  const page = await bootPage(browser, 900);
  try {
    await page.focus('[data-testid="sidebar-resize-handle"]');
    await page.keyboard.press('End');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const assertNoElementOverflow = async (selector, label) => {
      const measurement = await page.evaluate((targetSelector) => {
        const element = document.querySelector(targetSelector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing element: ${targetSelector}`);
        const rect = element.getBoundingClientRect();
        const offenders = Array.from(element.querySelectorAll('*'))
          .filter((child) => child instanceof HTMLElement)
          .map((child) => {
            const childRect = child.getBoundingClientRect();
            return {
              tag: child.tagName.toLowerCase(),
              className: child.className,
              testId: child.dataset.testid ?? null,
              width: Math.round(childRect.width),
              rightOverflow: Math.round(Math.max(0, childRect.right - rect.right)),
              scrollOverflow: Math.max(0, child.scrollWidth - child.clientWidth)
            };
          })
          .filter((item) => item.rightOverflow > 1 || item.scrollOverflow > 1)
          .sort((a, b) => Math.max(b.rightOverflow, b.scrollOverflow) - Math.max(a.rightOverflow, a.scrollOverflow))
          .slice(0, 10);
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          offenders
        };
      }, selector);
      assert.ok(
        measurement.scrollWidth <= measurement.clientWidth + epsilon,
        `${label}: element overflowed horizontally (${measurement.scrollWidth} > ${measurement.clientWidth}). Offenders: ${JSON.stringify(measurement.offenders)}`
      );
      assert.ok(measurement.documentScrollWidth <= measurement.viewportWidth + epsilon, `${label}: document overflowed horizontally (${measurement.documentScrollWidth} > ${measurement.viewportWidth}).`);
    };

    await assertNoElementOverflow('[data-testid="composer-dock"]', 'composer dock');
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="composer-controls"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Composer controls button is missing.');
      button.click();
    });
    await page.waitForSelector('[data-testid="composer-add-request"]');
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="composer-add-request"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Add request button is missing.');
      button.click();
    });
    await page.waitForSelector('[data-testid="composer-queue-toggle"]');
    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="composer-queue-toggle"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Composer queue button is missing.');
      button.click();
    });
    await page.waitForSelector('[data-testid="composer-queue-panel"]');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const queueGeometry = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="composer-queue-panel"]');
      if (!(panel instanceof HTMLElement)) throw new Error('Composer queue panel is missing.');
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentScrollWidth: document.documentElement.scrollWidth
      };
    });
    assert.ok(queueGeometry.left >= -1, `composer queue escaped left viewport edge (${queueGeometry.left}).`);
    assert.ok(queueGeometry.right <= queueGeometry.viewportWidth + 1, `composer queue escaped right viewport edge (${queueGeometry.right} > ${queueGeometry.viewportWidth}).`);
    assert.ok(queueGeometry.top >= -1, `composer queue escaped top viewport edge (${queueGeometry.top}).`);
    assert.ok(queueGeometry.bottom <= queueGeometry.viewportHeight + 1, `composer queue escaped bottom viewport edge (${queueGeometry.bottom} > ${queueGeometry.viewportHeight}).`);
    assert.ok(queueGeometry.documentScrollWidth <= queueGeometry.viewportWidth + epsilon, 'composer queue introduced document overflow.');
  } finally {
    await page.close();
  }
}

if (!existsSync(dist)) {
  console.error('dist/ is missing. Run npm run build before shell:check.');
  process.exit(1);
}

await new Promise((resolve) => server.listen(port, host, resolve));
const browser = await puppeteer.launch({
  executablePath: resolveBrowserExecutable(),
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none', '--proxy-server=direct://', '--proxy-bypass-list=*']
});

try {
  for (const width of desktopWidths) {
    await verifyWidth(browser, width);
    console.log(`Workspace shell geometry passed at ${width}px.`);
  }
  await verifyResizableSidebar(browser);
  console.log('Workspace sidebar resize behavior passed.');
  await verifyNarrowMainPages(browser);
  console.log('Workspace narrow-main page behavior passed.');
  await verifyNarrowMainWorkflows(browser);
  console.log('Workspace narrow-main workflow behavior passed.');
  console.log('Workspace shell geometry check passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
