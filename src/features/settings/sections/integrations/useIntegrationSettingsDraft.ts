import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IntegrationConfigSnapshot, IntegrationId, IntegrationRuntimeStatus } from '../../../../entities/integrations';
import { loadIntegrationConfig, runIntegrationAction, saveIntegrationConfig } from '../../../../infrastructure/integrations';

const defaultTelegramValues = {
  miniAppUrl: '',
  menuButtonText: 'Open Image Studio',
  startMessage: 'Open Image Studio from the button below.',
  allowedUserIds: '',
  pollingIntervalMs: 1500
};

export type IntegrationFeedback = { kind: 'info' | 'success' | 'error'; message: string } | null;

export interface TelegramIntegrationDraft {
  enabled: boolean;
  botToken: string;
  clearBotToken: boolean;
  miniAppUrl: string;
  menuButtonText: string;
  startMessage: string;
  allowedUserIds: string;
  pollingIntervalMs: number;
}

export function useIntegrationSettingsDraft(id: IntegrationId) {
  const [snapshot, setSnapshot] = useState<IntegrationConfigSnapshot | null>(null);
  const [draft, setDraft] = useState<TelegramIntegrationDraft>(() => createTelegramDraft(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<IntegrationFeedback>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const next = await loadIntegrationConfig(id);
      setSnapshot(next);
      setDraft(createTelegramDraft(next));
    } catch (error) {
      setFeedback({ kind: 'error', message: describeError(error) });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const next = await saveIntegrationConfig(id, {
        enabled: draft.enabled,
        values: serializeTelegramValues(draft),
        secretPatch: {
          secrets: {
            botToken: draft.clearBotToken ? { clear: true } : { value: draft.botToken }
          }
        }
      });
      setSnapshot(next);
      setDraft(createTelegramDraft(next));
      setFeedback({ kind: 'success', message: 'settings.integrations.saved' });
    } catch (error) {
      setFeedback({ kind: 'error', message: describeError(error) });
    } finally {
      setSaving(false);
    }
  }, [draft, id]);

  const runAction = useCallback(async (nextActionId: string, payload?: Record<string, unknown>) => {
    setActionId(nextActionId);
    setFeedback(null);
    try {
      const result = await runIntegrationAction(id, { actionId: nextActionId, payload });
      if (result.status) setSnapshot((prev) => prev ? { ...prev, status: result.status as IntegrationRuntimeStatus } : prev);
      setFeedback({ kind: result.ok ? 'success' : 'error', message: result.message });
    } catch (error) {
      setFeedback({ kind: 'error', message: describeError(error) });
    } finally {
      setActionId(null);
    }
  }, [id]);

  const tokenConfigured = Boolean(snapshot?.config.secrets.botToken?.configured);
  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    return JSON.stringify(serializeTelegramValues(draft)) !== JSON.stringify(pickTelegramValues(snapshot))
      || draft.enabled !== snapshot.config.enabled
      || draft.botToken.trim().length > 0
      || draft.clearBotToken;
  }, [draft, snapshot]);

  return { snapshot, draft, setDraft, loading, saving, actionId, feedback, reload, save, runAction, tokenConfigured, isDirty };
}

function createTelegramDraft(snapshot: IntegrationConfigSnapshot | null): TelegramIntegrationDraft {
  const values = snapshot ? pickTelegramValues(snapshot) : defaultTelegramValues;
  return {
    enabled: snapshot?.config.enabled ?? false,
    botToken: '',
    clearBotToken: false,
    miniAppUrl: values.miniAppUrl,
    menuButtonText: values.menuButtonText,
    startMessage: values.startMessage,
    allowedUserIds: values.allowedUserIds,
    pollingIntervalMs: values.pollingIntervalMs
  };
}

function pickTelegramValues(snapshot: IntegrationConfigSnapshot) {
  const values = snapshot.config.values;
  return {
    miniAppUrl: asString(values.miniAppUrl, defaultTelegramValues.miniAppUrl),
    menuButtonText: asString(values.menuButtonText, defaultTelegramValues.menuButtonText),
    startMessage: asString(values.startMessage, defaultTelegramValues.startMessage),
    allowedUserIds: asString(values.allowedUserIds, defaultTelegramValues.allowedUserIds),
    pollingIntervalMs: asNumber(values.pollingIntervalMs, defaultTelegramValues.pollingIntervalMs)
  };
}

function serializeTelegramValues(draft: TelegramIntegrationDraft) {
  return {
    miniAppUrl: draft.miniAppUrl.trim(),
    menuButtonText: draft.menuButtonText.trim(),
    startMessage: draft.startMessage.trim(),
    allowedUserIds: draft.allowedUserIds.trim(),
    pollingIntervalMs: Math.max(500, Math.round(Number(draft.pollingIntervalMs) || defaultTelegramValues.pollingIntervalMs))
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
