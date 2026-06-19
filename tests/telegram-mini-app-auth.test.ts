import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { validateTelegramMiniAppInitData } from '../server/integrations/telegram/miniAppAuth';

function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('Telegram Mini App auth accepts valid signed initData', () => {
  const initData = signInitData({
    auth_date: '1800000000',
    query_id: 'AAEAAAE',
    user: JSON.stringify({ id: 1001, first_name: 'Max' })
  }, 'bot-token');

  const result = validateTelegramMiniAppInitData(initData, 'bot-token', 60, 1800000030);
  assert.equal(result.ok, true);
  assert.equal(result.fields?.query_id, 'AAEAAAE');
  assert.equal(result.fields?.user, JSON.stringify({ id: 1001, first_name: 'Max' }));
});

test('Telegram Mini App auth rejects invalid hash after payload tampering', () => {
  const initData = signInitData({
    auth_date: '1800000000',
    user: JSON.stringify({ id: 1001 })
  }, 'bot-token');
  const tampered = initData.replace('1001', '1002');

  const result = validateTelegramMiniAppInitData(tampered, 'bot-token', 60, 1800000030);
  assert.equal(result.ok, false);
  assert.match(result.message, /hash is invalid/);
});

test('Telegram Mini App auth rejects expired auth_date', () => {
  const initData = signInitData({
    auth_date: '1800000000',
    user: JSON.stringify({ id: 1001 })
  }, 'bot-token');

  const result = validateTelegramMiniAppInitData(initData, 'bot-token', 10, 1800000100);
  assert.equal(result.ok, false);
  assert.match(result.message, /expired/);
});

test('Telegram Mini App auth rejects missing token or hash', () => {
  assert.deepEqual(
    validateTelegramMiniAppInitData('auth_date=1800000000&hash=abc', '', 60, 1800000001),
    { ok: false, message: 'Telegram bot token is not configured.' }
  );

  const result = validateTelegramMiniAppInitData('auth_date=1800000000', 'bot-token', 60, 1800000001);
  assert.equal(result.ok, false);
  assert.match(result.message, /hash is missing/);
});
