import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTelegramActionDisabledReason,
  getTelegramReadinessItems,
  isValidHttpsUrl,
  normalizeTelegramChatId,
  type TelegramPanelReadinessContext
} from '../src/features/settings/sections/integrations/telegramPanelValidation';

const baseContext: TelegramPanelReadinessContext = {
  actionId: null,
  draft: {
    enabled: true,
    botToken: '',
    clearBotToken: false,
    miniAppUrl: 'https://studio.example/app',
    menuButtonText: 'Open Image Studio',
    startMessage: 'Open Image Studio from the button below.',
    allowedUserIds: '',
    pollingIntervalMs: 1500
  },
  isDirty: false,
  loading: false,
  saving: false,
  status: { id: 'telegram', state: 'stopped', startedAt: null, updatedAt: 1 },
  testChatId: '1001',
  tokenConfigured: true
};

test('Telegram panel validates only public HTTPS Mini App URLs', () => {
  assert.equal(isValidHttpsUrl('https://studio.example/app'), true);
  assert.equal(isValidHttpsUrl('http://studio.example/app'), false);
  assert.equal(isValidHttpsUrl('http://127.0.0.1:5173'), false);
  assert.equal(isValidHttpsUrl('not a url'), false);
});

test('Telegram panel action guards prevent stale config and missing prerequisites', () => {
  assert.equal(getTelegramActionDisabledReason('start-runtime', baseContext), null);
  assert.equal(getTelegramActionDisabledReason('apply-menu-button', { ...baseContext, isDirty: true }), 'settings.telegram.reason.saveChangesFirst');
  assert.equal(getTelegramActionDisabledReason('start-runtime', { ...baseContext, tokenConfigured: false }), 'settings.telegram.reason.saveTokenFirst');
  assert.equal(getTelegramActionDisabledReason('start-runtime', { ...baseContext, draft: { ...baseContext.draft, miniAppUrl: 'http://example.test' } }), 'settings.telegram.reason.httpsUrlRequired');
  assert.equal(getTelegramActionDisabledReason('send-test-message', { ...baseContext, testChatId: '' }), 'settings.telegram.reason.testChatRequired');
});

test('Telegram panel diagnostics normalize chat ids and expose readiness states', () => {
  assert.equal(normalizeTelegramChatId('1001'), '1001');
  assert.equal(normalizeTelegramChatId('-100123'), '-100123');
  assert.equal(normalizeTelegramChatId('@image_studio_channel'), '@image_studio_channel');
  assert.equal(normalizeTelegramChatId('bad chat id'), null);

  const items = getTelegramReadinessItems({ ...baseContext, isDirty: true });
  assert.deepEqual(items.map((item) => [item.id, item.state]), [
    ['token', 'ok'],
    ['miniAppUrl', 'ok'],
    ['savedConfig', 'warn'],
    ['runtime', 'warn']
  ]);
});
