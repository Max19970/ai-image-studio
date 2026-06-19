import { useEffect, useState } from 'react';
import { validateTelegramMiniAppSession } from './auth';
import {
  applyTelegramMiniAppCssState,
  bindTelegramMiniAppEvents,
  ensureTelegramWebAppAvailable,
  readTelegramTheme,
  readTelegramViewport,
  type TelegramWebAppBridge
} from './telegramWebApp';
import type { TelegramMiniAppState } from './types';

const defaultTelegramMiniAppState: TelegramMiniAppState = {
  available: false,
  platform: null,
  version: null,
  authState: 'unavailable',
  authMessage: null,
  user: null,
  theme: { colorScheme: 'dark' },
  viewport: {
    height: null,
    stableHeight: null,
    safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
    contentSafeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 }
  }
};

export function useTelegramMiniApp(): TelegramMiniAppState {
  const [state, setState] = useState<TelegramMiniAppState>(defaultTelegramMiniAppState);

  useEffect(() => {
    let disposed = false;
    let unbindEvents: (() => void) | null = null;

    const publishBridgeState = (webApp: TelegramWebAppBridge, patch: Partial<TelegramMiniAppState> = {}) => {
      applyTelegramMiniAppCssState(webApp);
      setState((prev) => ({
        ...prev,
        available: true,
        platform: webApp.platform || 'unknown',
        version: webApp.version || 'unknown',
        theme: readTelegramTheme(webApp),
        viewport: readTelegramViewport(webApp),
        ...patch
      }));
    };

    const setup = async () => {
      try {
        const webApp = await ensureTelegramWebAppAvailable();
        if (disposed) return;
        if (!webApp) {
          applyTelegramMiniAppCssState(null);
          setState(defaultTelegramMiniAppState);
          return;
        }

        webApp.ready();
        webApp.expand();
        setTelegramChromeColors(webApp);
        publishBridgeState(webApp, {
          authState: webApp.initData ? 'validating' : 'unavailable',
          authMessage: webApp.initData ? 'Validating Telegram Mini App session…' : 'Telegram initData is unavailable.'
        });

        const handleBridgeChange = () => {
          if (disposed) return;
          setTelegramChromeColors(webApp);
          publishBridgeState(webApp);
        };
        unbindEvents = bindTelegramMiniAppEvents(webApp, handleBridgeChange);

        if (!webApp.initData) return;
        const auth = await validateTelegramMiniAppSession(webApp.initData);
        if (disposed) return;
        publishBridgeState(webApp, {
          authState: auth.ok ? 'valid' : 'invalid',
          authMessage: auth.message,
          user: auth.user ?? null
        });
      } catch (error) {
        if (disposed) return;
        setState((prev) => ({
          ...prev,
          authState: 'invalid',
          authMessage: error instanceof Error ? error.message : String(error)
        }));
      }
    };

    void setup();

    return () => {
      disposed = true;
      unbindEvents?.();
      applyTelegramMiniAppCssState(null);
    };
  }, []);

  return state;
}

function setTelegramChromeColors(webApp: TelegramWebAppBridge): void {
  const theme = readTelegramTheme(webApp);
  const headerColor = theme.headerBackgroundColor ?? theme.backgroundColor;
  const backgroundColor = theme.backgroundColor;
  const bottomBarColor = theme.bottomBarBackgroundColor ?? theme.secondaryBackgroundColor ?? theme.backgroundColor;

  if (headerColor) webApp.setHeaderColor?.(headerColor);
  if (backgroundColor) webApp.setBackgroundColor?.(backgroundColor);
  if (bottomBarColor && supportsBottomBarColor(webApp)) webApp.setBottomBarColor?.(bottomBarColor);
}

function supportsBottomBarColor(webApp: TelegramWebAppBridge): boolean {
  return typeof webApp.setBottomBarColor === 'function' && (webApp.isVersionAtLeast?.('7.10') ?? true);
}
