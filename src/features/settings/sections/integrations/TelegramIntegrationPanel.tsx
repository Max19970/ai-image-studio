import { useMemo, useState } from 'react';
import type { IntegrationDefinition } from '../../../../entities/integrations';
import { useI18n } from '../../../../i18n';
import { validateTelegramMiniAppSession } from '../../../../integrations/telegram-mini-app/auth';
import { useIntegrationSettingsDraft, type IntegrationFeedback } from './useIntegrationSettingsDraft';
import {
  getTelegramActionDisabledReason,
  getTelegramReadinessItems,
  normalizeTelegramChatId,
  type TelegramPanelActionId
} from './telegramPanelValidation';
import styles from './IntegrationsSettingsSection.module.css';
import panelStyles from './TelegramIntegrationPanel.module.css';

interface Props {
  definition: IntegrationDefinition;
  variant: 'desktop' | 'mobile';
}

export function TelegramIntegrationPanel({ definition, variant }: Props) {
  const { t } = useI18n();
  const state = useIntegrationSettingsDraft(definition.id);
  const { snapshot, draft, setDraft, loading, saving, actionId, feedback, save, runAction, tokenConfigured, isDirty } = state;
  const [testChatId, setTestChatId] = useState('');
  const [miniAppInitData, setMiniAppInitData] = useState('');
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<IntegrationFeedback>(null);
  const compact = variant === 'mobile';
  const status = snapshot?.status;
  const secret = snapshot?.config.secrets.botToken;
  const readinessContext = useMemo(() => ({ actionId, draft, isDirty, loading, saving, status, testChatId, tokenConfigured }), [actionId, draft, isDirty, loading, saving, status, testChatId, tokenConfigured]);
  const readinessItems = getTelegramReadinessItems(readinessContext);

  const runPanelAction = async (nextActionId: TelegramPanelActionId) => {
    const reason = getTelegramActionDisabledReason(nextActionId, readinessContext);
    if (reason) {
      setDiagnosticFeedback({ kind: 'error', message: reason });
      return;
    }
    setDiagnosticFeedback(null);
    if (nextActionId === 'send-test-message') {
      await runAction(nextActionId, { chatId: normalizeTelegramChatId(testChatId) });
      return;
    }
    await runAction(nextActionId);
  };

  const validateMiniAppAuth = async () => {
    setDiagnosticFeedback(null);
    if (!miniAppInitData.trim()) {
      setDiagnosticFeedback({ kind: 'error', message: 'settings.telegram.reason.initDataRequired' });
      return;
    }
    const result = await validateTelegramMiniAppSession(miniAppInitData.trim());
    setDiagnosticFeedback({ kind: result.ok ? 'success' : 'error', message: result.ok ? 'settings.telegram.miniAppAuthOk' : result.message });
  };

  return (
    <div className={styles.panel} data-testid="settings-telegram-panel" data-settings-variant={variant}>
      <section className={styles.statusCard}>
        <div>
          <p className="section-kicker">{t('settings.integrations.runtime')}</p>
          <h4>{statusLabel(status?.state, t)}</h4>
          <p>{status?.message ?? t('settings.integrations.runtimeIdle')}</p>
        </div>
        <span className={`${styles.statusPill} ${status ? styles[`state_${status.state}`] : ''}`}>{status?.state ?? 'stopped'}</span>
      </section>

      <section className={styles.card}>
        <CardHead kicker={t('settings.telegram.connection')} title={t('settings.telegram.botTitle')} text={t('settings.telegram.botText')} />
        <div className={compact ? styles.mobileFields : styles.fieldsGrid}>
          <label className={styles.fieldWide}>
            <span>{t('settings.telegram.botToken')}</span>
            <input
              type="password"
              value={draft.botToken}
              autoComplete="off"
              placeholder={secret?.configured ? t('settings.telegram.tokenConfigured', { preview: secret.preview ?? '••••' }) : t('settings.telegram.tokenPlaceholder')}
              onChange={(event) => setDraft((prev) => ({ ...prev, botToken: event.target.value, clearBotToken: false }))}
            />
          </label>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            <span>{t('settings.telegram.enabled')}</span>
          </label>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              disabled={!tokenConfigured}
              checked={draft.clearBotToken}
              onChange={(event) => setDraft((prev) => ({ ...prev, clearBotToken: event.target.checked, botToken: '' }))}
            />
            <span>{t('settings.telegram.clearToken')}</span>
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <CardHead kicker={t('settings.telegram.miniApp')} title={t('settings.telegram.miniAppTitle')} text={t('settings.telegram.httpsHint')} />
        <div className={compact ? styles.mobileFields : styles.fieldsGrid}>
          <TextField wide label={t('settings.telegram.miniAppUrl')} value={draft.miniAppUrl} onChange={(miniAppUrl) => setDraft((prev) => ({ ...prev, miniAppUrl }))} />
          <TextField label={t('settings.telegram.menuButtonText')} value={draft.menuButtonText} onChange={(menuButtonText) => setDraft((prev) => ({ ...prev, menuButtonText }))} />
        </div>
        <p className={panelStyles.cardNote}>{t('settings.telegram.localDevHint')}</p>
      </section>

      <section className={styles.card}>
        <CardHead kicker={t('settings.telegram.access')} title={t('settings.telegram.accessTitle')} text={t('settings.telegram.accessText')} />
        <div className={compact ? styles.mobileFields : styles.fieldsGrid}>
          <TextField label={t('settings.telegram.launchMode')} value={t('settings.telegram.launchModePolling')} disabled onChange={() => {}} />
          <TextField label={t('settings.telegram.pollingInterval')} type="number" value={String(draft.pollingIntervalMs)} onChange={(value) => setDraft((prev) => ({ ...prev, pollingIntervalMs: Number(value) }))} />
          <TextField wide label={t('settings.telegram.allowedUserIds')} value={draft.allowedUserIds} onChange={(allowedUserIds) => setDraft((prev) => ({ ...prev, allowedUserIds }))} />
          <label className={styles.fieldWide}>
            <span>{t('settings.telegram.startMessage')}</span>
            <textarea value={draft.startMessage} rows={3} onChange={(event) => setDraft((prev) => ({ ...prev, startMessage: event.target.value }))} />
          </label>
        </div>
      </section>

      <section className={styles.actionsCard}>
        <CardHead kicker={t('settings.integrations.actions')} title={t('settings.telegram.actionsTitle')} text={t('settings.telegram.actionsText')} />
        <div className={styles.actionGrid}>
          <button type="button" onClick={save} disabled={loading || saving || !isDirty}>{saving ? t('settings.integrations.saving') : t('settings.integrations.save')}</button>
          <ActionButton id="validate-token" label={t('settings.telegram.validateToken')} current={actionId} context={readinessContext} onClick={runPanelAction} t={t} />
          <ActionButton id="apply-menu-button" label={t('settings.telegram.applyMenu')} current={actionId} context={readinessContext} onClick={runPanelAction} t={t} />
          <ActionButton id="start-runtime" label={t('settings.telegram.startBot')} current={actionId} context={readinessContext} onClick={runPanelAction} t={t} />
          <ActionButton id="stop-runtime" label={t('settings.telegram.stopBot')} current={actionId} context={readinessContext} onClick={runPanelAction} t={t} />
        </div>
        {feedback && <div className={`${styles.feedback} ${styles[feedback.kind]}`}>{t(feedback.message)}</div>}
      </section>

      <section className={styles.card}>
        <CardHead kicker={t('settings.telegram.diagnostics')} title={t('settings.telegram.diagnosticsTitle')} text={t('settings.telegram.diagnosticsText')} />
        <div className={panelStyles.readinessList}>
          {readinessItems.map((item) => <ReadinessItem key={item.id} item={item} t={t} />)}
        </div>
        <div className={`${panelStyles.diagnosticFields} ${compact ? panelStyles.authArea : ''}`}>
          <TextField label={t('settings.telegram.testChatId')} value={testChatId} onChange={setTestChatId} />
          <ActionButton id="send-test-message" label={t('settings.telegram.sendTestMessage')} current={actionId} context={readinessContext} onClick={runPanelAction} t={t} />
        </div>
        <div className={`${panelStyles.diagnosticFields} ${panelStyles.authArea}`}>
          <label className={styles.fieldWide}>
            <span>{t('settings.telegram.initDataSample')}</span>
            <textarea value={miniAppInitData} rows={3} placeholder="auth_date=...&hash=..." onChange={(event) => setMiniAppInitData(event.target.value)} />
          </label>
          <button type="button" onClick={validateMiniAppAuth} disabled={loading || saving || Boolean(actionId)}>{t('settings.telegram.checkMiniAppAuth')}</button>
        </div>
        {diagnosticFeedback && <div className={`${styles.feedback} ${styles[diagnosticFeedback.kind]}`}>{t(diagnosticFeedback.message)}</div>}
      </section>
    </div>
  );
}

function CardHead({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className={styles.cardHead}>
      <div>
        <p className="section-kicker">{kicker}</p>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', wide = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean; disabled?: boolean }) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span>{label}</span>
      <input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ReadinessItem({ item, t }: { item: ReturnType<typeof getTelegramReadinessItems>[number]; t: (key: string) => string }) {
  return (
    <div className={`${panelStyles.readinessItem} ${panelStyles[`state_${item.state}`]}`}>
      <strong>{t(item.labelKey)}</strong>
      <span>{t(item.messageKey)}</span>
    </div>
  );
}

function ActionButton({ id, label, current, context, onClick, t }: { id: TelegramPanelActionId; label: string; current: string | null; context: Parameters<typeof getTelegramActionDisabledReason>[1]; onClick: (id: TelegramPanelActionId) => void; t: (key: string) => string }) {
  const reason = getTelegramActionDisabledReason(id, context);
  return <button type="button" data-testid={`settings-telegram-${id}`} title={reason ? t(reason) : undefined} onClick={() => onClick(id)} disabled={Boolean(reason)}>{current === id ? '…' : label}</button>;
}

function statusLabel(state: string | undefined, t: (key: string) => string): string {
  return t(`settings.integrations.status.${state ?? 'stopped'}`);
}
