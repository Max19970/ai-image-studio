import { useI18n } from '../../../../../i18n';
import { FieldShell, InfoTip } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { fieldId } from '../utils';

export function ProviderAuthFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  const content = (
    <>
      <FieldShell id={fieldId(idPrefix, 'apiKey')} label={t('settings.apiKey')} info={t('settings.info.apiKey')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" type="password" value={selectedProvider.apiKey} onChange={(e) => patchProvider('apiKey', e.target.value)} placeholder="sk-..." autoComplete="off" />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'authHeader')} label={t('settings.authHeader')} info={t('settings.info.authHeader')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.authHeaderName} onChange={(e) => patchProvider('authHeaderName', e.target.value)} placeholder="Authorization" />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'authScheme')} label={t('settings.authScheme')} info={t('settings.info.authScheme')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.authScheme} onChange={(e) => patchProvider('authScheme', e.target.value)} placeholder="Bearer" />
      </FieldShell>
      <div className={`${styles.checkCard} ${styles.wide}`}>
        <label className="inline-check">
          <input type="checkbox" className="h-4 w-4 rounded" checked={selectedProvider.persistApiKey} onChange={(e) => patchProvider('persistApiKey', e.target.checked)} />
          <span>{t('settings.persistApiKey')}</span>
        </label>
        <InfoTip id={fieldId(idPrefix, 'persistApiKey')} text={t('settings.info.persistApiKey')} activeId={activeInfo} onToggle={setActiveInfo} />
      </div>
    </>
  );

  return mobile ? <div className={`${styles.fieldGrid} ${styles.mobileFieldStack}`}>{content}</div> : content;
}
