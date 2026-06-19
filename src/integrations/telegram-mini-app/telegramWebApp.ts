import type {
  TelegramMiniAppSafeAreaInset,
  TelegramMiniAppThemeSnapshot,
  TelegramMiniAppViewportSnapshot
} from './types';

export interface TelegramWebAppThemeParams {
  bg_color?: string;
  text_color?: string;
  secondary_bg_color?: string;
  button_color?: string;
  button_text_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
}

export interface TelegramWebAppInset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface TelegramDownloadFileParams {
  url: string;
  file_name: string;
}

export interface TelegramWebAppBridge {
  initData: string;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark' | string;
  themeParams?: TelegramWebAppThemeParams;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: TelegramWebAppInset;
  contentSafeAreaInset?: TelegramWebAppInset;
  ready(): void;
  expand(): void;
  onEvent?(eventType: string, eventHandler: () => void): void;
  offEvent?(eventType: string, eventHandler: () => void): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  isVersionAtLeast?(version: string): boolean;
  openLink?(url: string, options?: { try_instant_view?: boolean }): void;
  showAlert?(message: string, callback?: () => void): void;
  downloadFile?(params: TelegramDownloadFileParams, callback?: (accepted: boolean) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppBridge;
    };
  }
}

const telegramScriptUrl = 'https://telegram.org/js/telegram-web-app.js';
let telegramScriptPromise: Promise<void> | null = null;

export function getTelegramWebApp(): TelegramWebAppBridge | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export async function ensureTelegramWebAppAvailable(): Promise<TelegramWebAppBridge | null> {
  if (typeof window === 'undefined') return null;
  const existing = getTelegramWebApp();
  if (existing) return existing;
  if (!hasTelegramLaunchParams() && !isTelegramUserAgent()) return null;

  await loadTelegramScript();
  return getTelegramWebApp();
}

export function readTelegramTheme(webApp: TelegramWebAppBridge | null): TelegramMiniAppThemeSnapshot {
  const params = webApp?.themeParams ?? {};
  return {
    colorScheme: webApp?.colorScheme ?? 'dark',
    backgroundColor: params.bg_color,
    textColor: params.text_color,
    secondaryBackgroundColor: params.secondary_bg_color,
    buttonColor: params.button_color,
    buttonTextColor: params.button_text_color,
    headerBackgroundColor: params.header_bg_color,
    bottomBarBackgroundColor: params.bottom_bar_bg_color
  };
}

export function readTelegramViewport(webApp: TelegramWebAppBridge | null): TelegramMiniAppViewportSnapshot {
  return {
    height: asFiniteNumber(webApp?.viewportHeight),
    stableHeight: asFiniteNumber(webApp?.viewportStableHeight),
    safeAreaInset: normalizeInset(webApp?.safeAreaInset),
    contentSafeAreaInset: normalizeInset(webApp?.contentSafeAreaInset)
  };
}

export function applyTelegramMiniAppCssState(webApp: TelegramWebAppBridge | null): void {
  const root = document.documentElement;
  if (!webApp) {
    root.removeAttribute('data-telegram-mini-app');
    root.removeAttribute('data-telegram-platform');
    root.removeAttribute('data-telegram-color-scheme');
    clearTelegramCssVariables(root);
    return;
  }

  const theme = readTelegramTheme(webApp);
  const viewport = readTelegramViewport(webApp);
  root.dataset.telegramMiniApp = 'true';
  root.dataset.telegramPlatform = webApp.platform || 'unknown';
  root.dataset.telegramColorScheme = theme.colorScheme || 'dark';
  setCssVariable(root, '--telegram-color-scheme', theme.colorScheme || 'dark');
  setCssVariable(root, '--telegram-viewport-height', viewport.height ? `${viewport.height}px` : '100dvh');
  setCssVariable(root, '--telegram-viewport-stable-height', viewport.stableHeight ? `${viewport.stableHeight}px` : '100dvh');
  applyInsetVariables(root, '--telegram-safe-area', viewport.safeAreaInset);
  applyInsetVariables(root, '--telegram-content-safe-area', viewport.contentSafeAreaInset);
  setOptionalCssVariable(root, '--telegram-theme-bg-color', theme.backgroundColor);
  setOptionalCssVariable(root, '--telegram-theme-text-color', theme.textColor);
  setOptionalCssVariable(root, '--telegram-theme-secondary-bg-color', theme.secondaryBackgroundColor);
  setOptionalCssVariable(root, '--telegram-theme-button-color', theme.buttonColor);
  setOptionalCssVariable(root, '--telegram-theme-button-text-color', theme.buttonTextColor);
  setOptionalCssVariable(root, '--telegram-theme-header-bg-color', theme.headerBackgroundColor);
  setOptionalCssVariable(root, '--telegram-theme-bottom-bar-bg-color', theme.bottomBarBackgroundColor);
}

export function bindTelegramMiniAppEvents(webApp: TelegramWebAppBridge, onChange: () => void): () => void {
  const eventNames = ['themeChanged', 'viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged'];
  for (const eventName of eventNames) webApp.onEvent?.(eventName, onChange);
  return () => {
    for (const eventName of eventNames) webApp.offEvent?.(eventName, onChange);
  };
}

function loadTelegramScript(): Promise<void> {
  if (telegramScriptPromise) return telegramScriptPromise;

  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${telegramScriptUrl}"]`);
  if (existingScript) {
    telegramScriptPromise = new Promise((resolve, reject) => {
      if (getTelegramWebApp()) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Telegram WebApp script failed to load.')), { once: true });
    });
    return telegramScriptPromise;
  }

  telegramScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = telegramScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Telegram WebApp script failed to load.'));
    document.head.appendChild(script);
  });
  return telegramScriptPromise;
}

function hasTelegramLaunchParams(): boolean {
  const launchParams = `${window.location.search}&${window.location.hash}`;
  return /tgWebAppData|tgWebAppVersion|tgWebAppPlatform|tgWebAppThemeParams/.test(launchParams);
}

function isTelegramUserAgent(): boolean {
  return /Telegram/i.test(window.navigator.userAgent);
}

function normalizeInset(value: TelegramWebAppInset | undefined): TelegramMiniAppSafeAreaInset {
  return {
    top: Math.max(0, Math.round(asFiniteNumber(value?.top) ?? 0)),
    right: Math.max(0, Math.round(asFiniteNumber(value?.right) ?? 0)),
    bottom: Math.max(0, Math.round(asFiniteNumber(value?.bottom) ?? 0)),
    left: Math.max(0, Math.round(asFiniteNumber(value?.left) ?? 0))
  };
}

function applyInsetVariables(root: HTMLElement, prefix: string, inset: TelegramMiniAppSafeAreaInset): void {
  setCssVariable(root, `${prefix}-top`, `${inset.top}px`);
  setCssVariable(root, `${prefix}-right`, `${inset.right}px`);
  setCssVariable(root, `${prefix}-bottom`, `${inset.bottom}px`);
  setCssVariable(root, `${prefix}-left`, `${inset.left}px`);
}

function setOptionalCssVariable(root: HTMLElement, key: string, value: string | undefined): void {
  if (typeof value === 'string' && value.trim()) root.style.setProperty(key, value);
  else root.style.removeProperty(key);
}

function setCssVariable(root: HTMLElement, key: string, value: string): void {
  root.style.setProperty(key, value);
}

function clearTelegramCssVariables(root: HTMLElement): void {
  for (const key of [
    '--telegram-viewport-height',
    '--telegram-viewport-stable-height',
    '--telegram-safe-area-top',
    '--telegram-safe-area-right',
    '--telegram-safe-area-bottom',
    '--telegram-safe-area-left',
    '--telegram-content-safe-area-top',
    '--telegram-content-safe-area-right',
    '--telegram-content-safe-area-bottom',
    '--telegram-content-safe-area-left',
    '--telegram-color-scheme',
    '--telegram-theme-bg-color',
    '--telegram-theme-text-color',
    '--telegram-theme-secondary-bg-color',
    '--telegram-theme-button-color',
    '--telegram-theme-button-text-color',
    '--telegram-theme-header-bg-color',
    '--telegram-theme-bottom-bar-bg-color'
  ]) {
    root.style.removeProperty(key);
  }
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
