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

const browserExecutable = resolveBrowserExecutable();

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


function createScreenshotApiMockResponse(request, scenario) {
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const json = (body, status = 200) => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });

  if (url.pathname === '/api/storage/generation-tasks') {
    if (method === 'GET') {
      return json({
        tasks: scenario.seedTasks ?? seedData.tasks,
        storage: { backend: 'screenshot-fixture', schemaVersion: 1, dbPath: `screenshot:${scenario.name}` }
      });
    }
    if (method === 'PUT' || method === 'DELETE') {
      return json({ ok: true, storage: { backend: 'screenshot-fixture', schemaVersion: 1, dbPath: `screenshot:${scenario.name}` } });
    }
  }

  if (url.pathname === '/api/storage/generation-task-asset') {
    return json({ image: null });
  }

  if (url.pathname === '/api/generation-tasks/events') {
    return { status: 204, contentType: 'text/plain; charset=utf-8', body: '' };
  }

  return null;
}

function createIntegrationApiMockResponse(request, fixture) {
  if (!fixture) return null;
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/integrations')) return null;
  const method = request.method().toUpperCase();
  const json = (body, status = 200) => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });

  if (url.pathname === '/api/integrations' && method === 'GET') {
    return json({ integrations: fixture.integrations ?? [] });
  }

  if (url.pathname === '/api/integrations/telegram/config') {
    if (method === 'GET' || method === 'PUT') return json(fixture.snapshot);
  }

  if (url.pathname === '/api/integrations/telegram/status' && method === 'GET') {
    return json(fixture.snapshot?.status ?? { id: 'telegram', state: 'stopped', startedAt: null, updatedAt: Date.now() });
  }

  const actionMatch = url.pathname.match(/^\/api\/integrations\/telegram\/actions\/([^/]+)$/);
  if (actionMatch && method === 'POST') {
    const actionId = decodeURIComponent(actionMatch[1]);
    const result = fixture.actionResults?.[actionId] ?? { ok: true, message: `Mocked integration action: ${actionId}` };
    return json(result);
  }

  if (url.pathname === '/api/integrations/telegram/mini-app/validate' && method === 'POST') {
    return json(fixture.miniAppValidation ?? { ok: false, message: 'Mini App mock is not configured.' });
  }

  return json({ error: { message: `Unhandled integration screenshot mock route: ${method} ${url.pathname}` } }, 404);
}

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

async function waitForComposerEditMode(page, timeout = 12000) {
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('button')).some((button) => {
      const text = (button.textContent || '').toLowerCase();
      const rect = button.getBoundingClientRect();
      const style = window.getComputedStyle(button);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && (text.includes('редакт') || text.includes('edit'));
    });
  }, { timeout });
}

async function clickComposerEditMode(page) {
  const clicked = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => {
      const text = (item.textContent || '').toLowerCase();
      const rect = item.getBoundingClientRect();
      const style = window.getComputedStyle(item);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && (text.includes('редакт') || text.includes('edit'));
    });
    if (!button) return false;
    button.click();
    return true;
  });
  if (!clicked) throw new Error('No visible composer edit mode button by text.');
}

async function assertComposerOverlayTopology(page, scenarioName, viewportName) {
  if (scenarioName === 'composer-compact' || scenarioName === 'composer-context-expanded') {
    const contextState = await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="composer-dock"]');
      const toggle = document.querySelector('[data-testid="composer-context-toggle"]');
      const region = document.querySelector('[data-testid="composer-context-region"]');
      const dockRect = dock?.getBoundingClientRect() ?? null;
      const toggleRect = toggle?.getBoundingClientRect() ?? null;
      const regionRect = region?.getBoundingClientRect() ?? null;
      const regionStyle = region ? window.getComputedStyle(region) : null;
      const hasMotion = Boolean(regionStyle?.transitionDuration.split(',').some((value) => Number.parseFloat(value) > 0.01));
      return {
        centered: Boolean(dockRect && toggleRect && Math.abs((dockRect.left + dockRect.width / 2) - (toggleRect.left + toggleRect.width / 2)) <= 1),
        expanded: region?.getAttribute('data-expanded') === 'true',
        regionHeight: regionRect?.height ?? -1,
        hasMotion
      };
    });
    const expectedExpanded = scenarioName === 'composer-context-expanded';
    const heightMatches = expectedExpanded ? contextState.regionHeight > 1 : contextState.regionHeight <= 1;
    if (!contextState.centered || contextState.expanded !== expectedExpanded || !heightMatches || !contextState.hasMotion) {
      throw new Error(`Composer context disclosure is invalid: ${JSON.stringify(contextState)}`);
    }
  }

  if (scenarioName === 'composer-model-picker' || scenarioName === 'composer-model-picker-small') {
    const topology = await page.evaluate(() => {
      const visibleLayers = Array.from(document.querySelectorAll('[data-floating-popover-layer="true"]')).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });
      const modelList = document.querySelector('[data-testid="composer-model-list"]');
      const picker = document.querySelector('[data-testid="composer-grouped-model-picker"]');
      const layer = modelList?.closest('[data-floating-popover-layer="true"]') ?? null;
      const searchInput = picker?.querySelector('input[type="search"]') ?? null;
      const searchField = searchInput?.parentElement ?? null;
      const pickerBody = picker?.querySelector('nav')?.parentElement ?? null;
      const layerRect = layer?.getBoundingClientRect() ?? null;
      const pickerRect = picker?.getBoundingClientRect() ?? null;
      const searchRect = searchField?.getBoundingClientRect() ?? null;
      const bodyRect = pickerBody?.getBoundingClientRect() ?? null;
      const totalItems = Number(picker?.getAttribute('data-total-items') ?? 0);
      const renderedItems = Number(picker?.getAttribute('data-rendered-items') ?? 0);
      const balancedInset = (inner, outer) => Boolean(
        inner && outer && Math.abs((inner.left - outer.left) - (outer.right - inner.right)) <= 1.5
      );
      return {
        visibleLayerCount: visibleLayers.length,
        modelListInsideLayer: Boolean(layer),
        hasSearch: Boolean(searchInput),
        providerCount: picker?.querySelectorAll('nav button').length ?? 0,
        totalItems,
        renderedItems,
        layerInViewport: Boolean(layerRect && layerRect.left >= 0 && layerRect.right <= window.innerWidth + .5),
        pickerInViewport: Boolean(pickerRect && pickerRect.left >= 0 && pickerRect.right <= window.innerWidth + .5),
        searchInsetsBalanced: balancedInset(searchRect, pickerRect),
        bodyInsetsBalanced: balancedInset(bodyRect, pickerRect)
      };
    });
    const largeFixture = scenarioName === 'composer-model-picker';
    if (
      topology.visibleLayerCount !== 1
      || !topology.modelListInsideLayer
      || !topology.hasSearch
      || topology.providerCount < (largeFixture ? 10 : 1)
      || topology.totalItems < (largeFixture ? 500 : 1)
      || topology.renderedItems <= 0
      || topology.renderedItems > topology.totalItems
      || (largeFixture && topology.renderedItems >= topology.totalItems)
      || (largeFixture && topology.renderedItems > 100)
      || !topology.layerInViewport
      || !topology.pickerInViewport
      || !topology.searchInsetsBalanced
      || !topology.bodyInsetsBalanced
    ) {
      throw new Error(`Composer model picker topology or virtualization is invalid: ${JSON.stringify(topology)}`);
    }
  }

  if (scenarioName === 'composer-queue' && viewportName === 'mobile') {
    const queuePosition = await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="composer-dock"]');
      const panel = document.querySelector('[data-testid="composer-queue-panel"]');
      const dockRect = dock?.getBoundingClientRect() ?? null;
      const panelRect = panel?.getBoundingClientRect() ?? null;
      const panelStyle = panel ? window.getComputedStyle(panel) : null;
      return {
        attachedGap: dockRect && panelRect ? dockRect.top - panelRect.bottom : null,
        position: panelStyle?.position ?? null,
        animationName: panelStyle?.animationName ?? null
      };
    });
    if (
      queuePosition.attachedGap === null
      || Math.abs(queuePosition.attachedGap) > 12
      || queuePosition.position !== 'absolute'
      || !queuePosition.animationName?.includes('queuePanelMobileIn')
    ) {
      throw new Error(`Mobile composer queue is not attached to the dock: ${JSON.stringify(queuePosition)}`);
    }
  }

  if (scenarioName === 'composer-queue-item-menu') {
    const topology = await page.evaluate(() => {
      const queue = document.querySelector('[data-testid="composer-queue-panel"]');
      const menus = Array.from(document.querySelectorAll('[data-testid="composer-queue-item-menu"]'));
      const menu = menus[0] ?? null;
      const layer = menu?.closest('[data-floating-popover-layer="true"]') ?? null;
      const rect = layer?.getBoundingClientRect() ?? null;
      return {
        menuCount: menus.length,
        insideQueue: Boolean(queue && menu && queue.contains(menu)),
        portalLayer: Boolean(layer && layer.parentElement === document.body),
        inViewport: Boolean(rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight)
      };
    });
    if (topology.menuCount !== 1 || topology.insideQueue || !topology.portalLayer || !topology.inViewport) {
      throw new Error(`Queue item menu topology is invalid: ${JSON.stringify(topology)}`);
    }
  }
}

async function assertScenarioDestination(page, scenario, stepIndex, viewportName) {
  const configuredSelector = scenario.assertSelectorByViewport?.[viewportName] || scenario.assertSelector;
  const previousWait = scenario.steps.slice(0, stepIndex).reverse().find((item) => item.type === 'waitForSelector');
  const selector = configuredSelector || previousWait?.selector;
  if (!selector) throw new Error(`Scenario ${scenario.name} has no destination assertion before screenshot.`);

  await page.waitForSelector(selector, { timeout: 12000 });
  const visible = await page.evaluate((targetSelector) => {
    return Array.from(document.querySelectorAll(targetSelector)).some((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    });
  }, selector);
  if (!visible) throw new Error(`Scenario ${scenario.name} destination is not visible: ${selector}`);
  await assertComposerOverlayTopology(page, scenario.name, viewportName);
}

async function runStep(page, step, viewportName, scenario, stepIndex) {
  if (Array.isArray(step.viewports) && !step.viewports.includes(viewportName)) return;
  const scenarioName = scenario.name;
  if (scenarioName === 'composer-comfy-controls' && step.type === 'waitForSelector' && step.selector === '[data-testid="composer-parameters"]') {
    await page.waitForSelector(step.selector, { timeout: step.timeout ?? 12000 });
    await clickFirstVisible(page, step.selector);
    await page.waitForSelector('[data-testid="parameters-modal"]', { timeout: step.timeout ?? 12000 });
    return;
  }
  if (scenarioName === 'batch-comfy-controls' && step.type === 'waitForSelector' && step.selector === '[data-testid="batch-draft-comfy-loras"]') {
    await page.waitForSelector('[data-testid="batch-draft-parameters"]', { timeout: step.timeout ?? 12000 });
    await clickFirstVisible(page, '[data-testid="batch-draft-parameters"]');
    await page.waitForSelector('[data-testid="parameters-modal"]', { timeout: step.timeout ?? 12000 });
    return;
  }
  if (scenarioName === 'composer-edit-status' && step.selector === '[data-testid="composer-mode-edit"]') {
    if (step.type === 'waitForSelector') {
      await waitForComposerEditMode(page, step.timeout ?? 12000);
      return;
    }
    if (step.type === 'click') {
      await clickComposerEditMode(page);
      return;
    }
  }
  if (step.type === 'wait') await wait(step.ms ?? 150);
  if (step.type === 'waitForSelector') await page.waitForSelector(step.selector, { timeout: step.timeout ?? 12000 });
  if (step.type === 'click') await clickFirstVisible(page, step.selector, Boolean(step.optional));
  if (step.type === 'openTab') await openTab(page, step.tab);
  if (step.type === 'scroll') await page.evaluate((y) => window.scrollTo(0, y), step.y ?? 0);
  if (step.type === 'scrollToSelector') {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`No element for scrollToSelector: ${selector}`);
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
    }, step.selector);
  }
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
  if (step.type === 'screenshot') {
    await assertScenarioDestination(page, scenario, stepIndex, viewportName);
    await screenshot(page, viewportName, scenarioName);
  }
}

async function bootPage(browser, viewportName, scenario) {
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(15000);
    const viewport = viewports[viewportName];
    await page.setViewport(viewport);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const apiMock = createScreenshotApiMockResponse(request, scenario) ?? createIntegrationApiMockResponse(request, scenario.integrationApiFixture);
      if (apiMock) {
        request.respond(apiMock);
        return;
      }
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
    executablePath: browserExecutable,
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
      for (const [stepIndex, step] of scenario.steps.entries()) await runStep(page, step, viewportName, scenario, stepIndex);
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
