import { useI18n } from '../../../../../i18n';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { hasAdapterSettingsField, labelForAdapterSettingsField } from '../adapterFields';
import { fieldId } from '../utils';

export function ProviderEndpointFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  const fields = [
    hasAdapterSettingsField(selectedProvider, 'generationEndpoint') ? (
      <FieldShell key="generationEndpoint" id={fieldId(idPrefix, 'generationEndpoint')} label={labelForAdapterSettingsField(selectedProvider, 'generationEndpoint', t('settings.generationEndpoint'))} info={t('settings.info.generationEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.generationEndpoint} onChange={(e) => patchProvider('generationEndpoint', e.target.value)} />
      </FieldShell>
    ) : null,
    hasAdapterSettingsField(selectedProvider, 'editEndpoint') ? (
      <FieldShell key="editEndpoint" id={fieldId(idPrefix, 'editEndpoint')} label={labelForAdapterSettingsField(selectedProvider, 'editEndpoint', t('settings.editEndpoint'))} info={t('settings.info.editEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.editEndpoint} onChange={(e) => patchProvider('editEndpoint', e.target.value)} />
      </FieldShell>
    ) : null,
    hasAdapterSettingsField(selectedProvider, 'responsesEndpoint') ? (
      <FieldShell key="responsesEndpoint" id={fieldId(idPrefix, 'responsesEndpoint')} label={labelForAdapterSettingsField(selectedProvider, 'responsesEndpoint', t('settings.responsesEndpoint'))} info={t('settings.info.responsesEndpoint')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <input className="field-input" value={selectedProvider.responsesEndpoint} onChange={(e) => patchProvider('responsesEndpoint', e.target.value)} />
      </FieldShell>
    ) : null
  ].filter(Boolean);

  if (!fields.length) return null;

  return mobile ? <div className={`${styles.fieldGrid} ${styles.mobileFieldStack}`}>{fields}</div> : <>{fields}</>;
}
