import type { IntegrationRuntimeConfig } from '../types';

export type TelegramLaunchMode = 'polling' | 'webhook';
export type TelegramChatId = number | string;

export interface TelegramBotUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: { id: TelegramChatId; type?: string };
  from?: { id: number; is_bot?: boolean; username?: string; first_name?: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMenuButtonWebApp {
  type: 'web_app';
  text: string;
  web_app: { url: string };
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: Array<Array<{ text: string; web_app?: { url: string } }>>;
}

export interface TelegramBotCommand {
  command: string;
  description: string;
}

export interface TelegramGetUpdatesOptions {
  offset?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export interface TelegramBotApiPort {
  getMe(signal?: AbortSignal): Promise<TelegramBotUser>;
  deleteWebhook(dropPendingUpdates?: boolean, signal?: AbortSignal): Promise<boolean>;
  setChatMenuButton(menuButton: TelegramMenuButtonWebApp, signal?: AbortSignal): Promise<boolean>;
  setMyCommands(commands: TelegramBotCommand[], signal?: AbortSignal): Promise<boolean>;
  sendMessage(
    chatId: TelegramChatId,
    text: string,
    replyMarkup?: TelegramInlineKeyboardMarkup,
    signal?: AbortSignal
  ): Promise<unknown>;
  getUpdates(options: TelegramGetUpdatesOptions, signal?: AbortSignal): Promise<TelegramUpdate[]>;
}

export interface TelegramRuntimeOptions {
  enabled: boolean;
  launchMode: TelegramLaunchMode;
  botToken: string;
  miniAppUrl: string;
  menuButtonText: string;
  startMessage: string;
  allowedUserIds: Set<string>;
  pollingIntervalMs: number;
}

export interface TelegramRuntimeConfigResult {
  ok: boolean;
  config?: TelegramRuntimeOptions;
  message?: string;
}

const defaultMenuButtonText = 'Open Image Studio';
const defaultStartMessage = 'Open Image Studio from the button below.';

export function resolveTelegramRuntimeConfig(config: IntegrationRuntimeConfig): TelegramRuntimeConfigResult {
  const botToken = asString(config.secrets.botToken).trim();
  const values = config.values;
  const launchMode = asLaunchMode(values.launchMode);
  const miniAppUrl = asString(values.miniAppUrl).trim();

  if (!config.enabled) return { ok: false, message: 'Telegram integration is disabled.' };
  if (!botToken) return { ok: false, message: 'Telegram bot token is not configured.' };
  if (launchMode !== 'polling') return { ok: false, message: 'Only polling mode is supported in this build.' };
  if (!isHttpsUrl(miniAppUrl)) return { ok: false, message: 'Mini App URL must be a valid HTTPS URL.' };

  return {
    ok: true,
    config: {
      enabled: config.enabled,
      launchMode,
      botToken,
      miniAppUrl,
      menuButtonText: asString(values.menuButtonText).trim() || defaultMenuButtonText,
      startMessage: asString(values.startMessage).trim() || defaultStartMessage,
      allowedUserIds: parseAllowedUserIds(values.allowedUserIds),
      pollingIntervalMs: clampPollingInterval(values.pollingIntervalMs)
    }
  };
}

export function parseAllowedUserIds(value: unknown): Set<string> {
  const source = Array.isArray(value) ? value.join(',') : asString(value);
  return new Set(
    source
      .split(/[\s,;]+/g)
      .map((item) => item.trim())
      .filter((item) => /^\d+$/.test(item))
  );
}

export function isUserAllowed(userId: number | undefined, allowedUserIds: Set<string>): boolean {
  if (allowedUserIds.size === 0) return true;
  return typeof userId === 'number' && allowedUserIds.has(String(userId));
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asLaunchMode(value: unknown): TelegramLaunchMode {
  return value === 'webhook' ? 'webhook' : 'polling';
}

function clampPollingInterval(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 1500;
  return Math.min(30_000, Math.max(500, Math.round(numeric)));
}
