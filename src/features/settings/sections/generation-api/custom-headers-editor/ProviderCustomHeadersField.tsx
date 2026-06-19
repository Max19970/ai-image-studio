import { useI18n } from '../../../../../i18n';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { hasAdapterSettingsField, labelForAdapterSettingsField } from '../adapterFields';
import { fieldId } from '../utils';

export function ProviderCustomHeadersField({ context, idPrefix }: { context: SettingsSectionContext; idPrefix: string }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider || !hasAdapterSettingsField(selectedProvider, 'customHeadersJson')) return null;

  return (
    <FieldShell id={fieldId(idPrefix, 'customHeaders')} label={labelForAdapterSettingsField(selectedProvider, 'customHeadersJson', t('settings.customHeaders'))} info={t('settings.info.customHeaders')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
      <textarea className="field-input min-h-[110px]" value={selectedProvider.customHeadersJson} onChange={(e) => patchProvider('customHeadersJson', e.target.value)} placeholder={'{ "OpenAI-Organization": "org_..." }'} />
    </FieldShell>
  );
}
