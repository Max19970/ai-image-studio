import { useI18n } from '../../../../../i18n';
import { FieldShell, InfoTip } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { hasAdapterSettingsField, labelForAdapterSettingsField } from '../adapterFields';
import { fieldId } from '../utils';

export function ProviderAuthFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  const fields = [
    hasAdapterSettingsField(selectedProvider, 'apiKey') ? (
      <FieldShell key="apiKey" id={fieldId(idPrefix, 'apiKey')} label={labelForAdapterSettingsField(selectedProvider, 'apiKey', t('settings.apiKey'))} info={t('settings.info.apiKey')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" type="password" value={selectedProvider.apiKey} onChange={(e) => patchProvider('apiKey', e.target.value)} placeholder="sk-..." autoComplete="off" />
      </FieldShell>
    ) : null,
    hasAdapterSettingsField(selectedProvider, 'authHeaderName') ? (
      <FieldShell key="authHeader" id={fieldId(idPrefix, 'authHeader')} label={labelForAdapterSettingsField(selectedProvider, 'authHeaderName', t('settings.authHeader'))} info={t('settings.info.authHeader')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.authHeaderName} onChange={(e) => patchProvider('authHeaderName', e.target.value)} placeholder="Authorization" />
      </FieldShell>
    ) : null,
    hasAdapterSettingsField(selectedProvider, 'authScheme') ? (
      <FieldShell key="authScheme" id={fieldId(idPrefix, 'authScheme')} label={labelForAdapterSettingsField(selectedProvider, 'authScheme', t('settings.authScheme'))} info={t('settings.info.authScheme')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.authScheme} onChange={(e) => patchProvider('authScheme', e.target.value)} placeholder="Bearer" />
      </FieldShell>
    ) : null,
    hasAdapterSettingsField(selectedProvider, 'persistApiKey') || hasAdapterSettingsField(selectedProvider, 'apiKey') ? (
      <div key="persistApiKey" className={`${styles.checkCard} ${styles.wide}`}>
        <label className="inline-check">
          <input type="checkbox" className="h-4 w-4 rounded" checked={selectedProvider.persistApiKey} onChange={(e) => patchProvider('persistApiKey', e.target.checked)} />
          <span>{t('settings.persistApiKey')}</span>
        </label>
        <InfoTip id={fieldId(idPrefix, 'persistApiKey')} text={t('settings.info.persistApiKey')} activeId={activeInfo} onToggle={setActiveInfo} />
      </div>
    ) : null
  ].filter(Boolean);

  if (!fields.length) return null;

  return mobile ? <div className={`${styles.fieldGrid} ${styles.mobileFieldStack}`}>{fields}</div> : <>{fields}</>;
}
