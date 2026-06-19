import crypto from 'node:crypto';

export interface TelegramMiniAppAuthResult {
  ok: boolean;
  message: string;
  fields?: Record<string, string>;
}

export function validateTelegramMiniAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 24 * 60 * 60,
  nowSeconds = Math.floor(Date.now() / 1000)
): TelegramMiniAppAuthResult {
  if (!initData.trim()) return { ok: false, message: 'Telegram initData is empty.' };
  if (!botToken.trim()) return { ok: false, message: 'Telegram bot token is not configured.' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash') ?? '';
  if (!hash) return { ok: false, message: 'Telegram initData hash is missing.' };
  params.delete('hash');

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, message: 'Telegram auth_date is missing.' };
  if (nowSeconds - authDate > maxAgeSeconds) return { ok: false, message: 'Telegram initData is expired.' };

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!safeEqualHex(hash, expectedHash)) return { ok: false, message: 'Telegram initData hash is invalid.' };
  return { ok: true, message: 'Telegram initData is valid.', fields: Object.fromEntries(params.entries()) };
}

function safeEqualHex(left: string, right: string): boolean {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalizedLeft) || !/^[a-f0-9]+$/.test(normalizedRight)) return false;
  const leftBuffer = Buffer.from(normalizedLeft, 'hex');
  const rightBuffer = Buffer.from(normalizedRight, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
