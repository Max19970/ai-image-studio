import type { TelegramMiniAppAuthResponse } from './types';

export const telegramMiniAppValidatePath = '/api/integrations/telegram/mini-app/validate';

export async function validateTelegramMiniAppSession(initData: string): Promise<TelegramMiniAppAuthResponse> {
  const response = await fetch(telegramMiniAppValidatePath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    return {
      ok: false,
      message: describeMiniAppAuthError(payload, text || response.statusText || `HTTP ${response.status}`)
    };
  }

  return normalizeAuthResponse(payload);
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeAuthResponse(value: unknown): TelegramMiniAppAuthResponse {
  if (!value || typeof value !== 'object') return { ok: false, message: 'Telegram Mini App auth returned an invalid response.' };
  const root = value as Record<string, unknown>;
  return {
    ok: root.ok === true,
    message: typeof root.message === 'string' ? root.message : 'Telegram Mini App auth finished.',
    user: normalizeUser(root.user),
    authDate: typeof root.authDate === 'number' && Number.isFinite(root.authDate) ? root.authDate : undefined
  };
}

function normalizeUser(value: unknown): TelegramMiniAppAuthResponse['user'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'number' || !Number.isFinite(user.id)) return undefined;
  return {
    id: user.id,
    username: asString(user.username),
    firstName: asString(user.firstName),
    lastName: asString(user.lastName)
  };
}

function describeMiniAppAuthError(value: unknown, fallback: string): string {
  if (value && typeof value === 'object') {
    const root = value as { error?: unknown; message?: unknown };
    const error = root.error;
    if (typeof root.message === 'string') return root.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }
  return fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
