import { useI18n } from '../../../../../i18n';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { fieldId } from '../utils';

export function ProviderEndpointFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  const content = (
    <>
      <FieldShell id={fieldId(idPrefix, 'generationEndpoint')} label={t('settings.generationEndpoint')} info={t('settings.info.generationEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.generationEndpoint} onChange={(e) => patchProvider('generationEndpoint', e.target.value)} />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'editEndpoint')} label={t('settings.editEndpoint')} info={t('settings.info.editEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.editEndpoint} onChange={(e) => patchProvider('editEndpoint', e.target.value)} />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'responsesEndpoint')} label={t('settings.responsesEndpoint')} info={t('settings.info.responsesEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.responsesEndpoint} onChange={(e) => patchProvider('responsesEndpoint', e.target.value)} />
      </FieldShell>
    </>
  );

  return mobile ? <div className={`${styles.fieldGrid} ${styles.mobileFieldStack}`}>{content}</div> : content;
}
