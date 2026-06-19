import type { IntegrationActionContext, IntegrationActionResult, IntegrationRuntimeAdapter } from '../types';
import { TelegramBotApiClient } from './client';
import { TelegramPollingRuntime } from './runtime';
import { resolveTelegramRuntimeConfig } from './types';

export function createTelegramIntegrationAdapter(runtime = new TelegramPollingRuntime()): IntegrationRuntimeAdapter {
  return {
    id: 'telegram',
    label: 'Телеграм',
    description: 'Telegram bot runtime and Mini App launcher.',
    supportsRuntime: true,
    getStatus: () => runtime.getStatus(),
    start: (config) => runtime.start(config),
    stop: () => runtime.stop(),
    runAction: (actionId, context) => runTelegramAction(actionId, context)
  };
}

async function runTelegramAction(actionId: string, context: IntegrationActionContext): Promise<IntegrationActionResult> {
  if (actionId === 'validate-token') return validateToken(context);
  if (actionId === 'apply-menu-button') return applyMenuButton(context);
  if (actionId === 'send-test-message') return sendTestMessage(context);
  return { ok: false, message: `Unknown Telegram action: ${actionId}` };
}

async function validateToken(context: IntegrationActionContext): Promise<IntegrationActionResult> {
  const resolved = resolveTelegramRuntimeConfig(context.config);
  if (!resolved.ok || !resolved.config) return { ok: false, message: resolved.message ?? 'Invalid Telegram configuration.' };

  const client = new TelegramBotApiClient(resolved.config.botToken);
  const bot = await client.getMe();
  return {
    ok: true,
    message: `Telegram bot token is valid for @${bot.username ?? bot.first_name}.`,
    data: { id: bot.id, username: bot.username, firstName: bot.first_name }
  };
}

async function applyMenuButton(context: IntegrationActionContext): Promise<IntegrationActionResult> {
  const resolved = resolveTelegramRuntimeConfig(context.config);
  if (!resolved.ok || !resolved.config) return { ok: false, message: resolved.message ?? 'Invalid Telegram configuration.' };

  const config = resolved.config;
  const client = new TelegramBotApiClient(config.botToken);
  await client.setChatMenuButton({ type: 'web_app', text: config.menuButtonText, web_app: { url: config.miniAppUrl } });
  await client.setMyCommands([{ command: 'start', description: 'Open Image Studio' }]);
  return { ok: true, message: 'Telegram menu button configured.' };
}

export const telegramIntegrationAdapter = createTelegramIntegrationAdapter();


async function sendTestMessage(context: IntegrationActionContext): Promise<IntegrationActionResult> {
  const resolved = resolveTelegramRuntimeConfig(context.config);
  if (!resolved.ok || !resolved.config) return { ok: false, message: resolved.message ?? 'Invalid Telegram configuration.' };

  const chatId = normalizeChatId(context.payload?.chatId);
  if (!chatId) return { ok: false, message: 'Test chat id is required.' };

  const config = resolved.config;
  const client = new TelegramBotApiClient(config.botToken);
  await client.sendMessage(chatId, config.startMessage, {
    inline_keyboard: [[{ text: config.menuButtonText, web_app: { url: config.miniAppUrl } }]]
  });
  return { ok: true, message: 'Telegram test message sent.' };
}

function normalizeChatId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+$/.test(trimmed)) return trimmed;
  if (/^@[A-Za-z0-9_]{5,}$/.test(trimmed)) return trimmed;
  return null;
}
