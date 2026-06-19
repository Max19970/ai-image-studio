import type { IntegrationRuntimeStatus } from '../../../../entities/integrations';
import type { TelegramIntegrationDraft } from './useIntegrationSettingsDraft';

export type TelegramPanelActionId =
  | 'validate-token'
  | 'apply-menu-button'
  | 'start-runtime'
  | 'stop-runtime'
  | 'send-test-message';

export interface TelegramPanelReadinessContext {
  actionId: string | null;
  draft: TelegramIntegrationDraft;
  isDirty: boolean;
  loading: boolean;
  saving: boolean;
  status?: IntegrationRuntimeStatus;
  testChatId?: string;
  tokenConfigured: boolean;
}

export interface TelegramReadinessItem {
  id: string;
  state: 'ok' | 'warn' | 'error';
  labelKey: string;
  messageKey: string;
}

export function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeTelegramChatId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^-?\d+$/.test(trimmed)) return trimmed;
  if (/^@[A-Za-z0-9_]{5,}$/.test(trimmed)) return trimmed;
  return null;
}

export function getTelegramReadinessItems(ctx: TelegramPanelReadinessContext): TelegramReadinessItem[] {
  const miniAppUrl = ctx.draft.miniAppUrl.trim();
  return [
    ctx.tokenConfigured && !ctx.draft.clearBotToken
      ? item('token', 'ok', 'settings.telegram.ready.token', 'settings.telegram.ready.tokenOk')
      : item('token', 'error', 'settings.telegram.ready.token', 'settings.telegram.ready.tokenMissing'),
    isValidHttpsUrl(miniAppUrl)
      ? item('miniAppUrl', 'ok', 'settings.telegram.ready.url', 'settings.telegram.ready.urlOk')
      : item('miniAppUrl', miniAppUrl ? 'error' : 'warn', 'settings.telegram.ready.url', miniAppUrl ? 'settings.telegram.ready.urlInvalid' : 'settings.telegram.ready.urlMissing'),
    ctx.isDirty
      ? item('savedConfig', 'warn', 'settings.telegram.ready.saved', 'settings.telegram.ready.savedDirty')
      : item('savedConfig', 'ok', 'settings.telegram.ready.saved', 'settings.telegram.ready.savedOk'),
    ctx.status?.state === 'running'
      ? item('runtime', 'ok', 'settings.telegram.ready.runtime', 'settings.telegram.ready.runtimeRunning')
      : item('runtime', 'warn', 'settings.telegram.ready.runtime', 'settings.telegram.ready.runtimeStopped')
  ];
}

export function getTelegramActionDisabledReason(action: TelegramPanelActionId, ctx: TelegramPanelReadinessContext): string | null {
  if (ctx.loading || ctx.saving || ctx.actionId) return 'settings.telegram.reason.busy';
  if (action === 'stop-runtime') return ctx.status?.state && ctx.status.state !== 'stopped' ? null : 'settings.telegram.reason.notRunning';
  if (!ctx.tokenConfigured || ctx.draft.clearBotToken) return 'settings.telegram.reason.saveTokenFirst';
  if (action === 'validate-token') {
    return ctx.draft.botToken.trim() ? 'settings.telegram.reason.saveTokenFirst' : null;
  }
  if (ctx.isDirty) return 'settings.telegram.reason.saveChangesFirst';
  if (!isValidHttpsUrl(ctx.draft.miniAppUrl)) return 'settings.telegram.reason.httpsUrlRequired';
  if (action === 'send-test-message' && !normalizeTelegramChatId(ctx.testChatId ?? '')) return 'settings.telegram.reason.testChatRequired';
  return null;
}

function item(id: string, state: TelegramReadinessItem['state'], labelKey: string, messageKey: string): TelegramReadinessItem {
  return { id, state, labelKey, messageKey };
}
