import { useI18n } from '../../../../../i18n';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderAdapterField } from '../adapter-selector/ProviderAdapterField';
import { fieldId } from '../utils';

export function ProviderCoreFields({ context, idPrefix }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  return (
    <>
      <FieldShell id={fieldId(idPrefix, 'providerName')} label={t('settings.providerName')} info={t('settings.info.providerName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.name} onChange={(e) => patchProvider('name', e.target.value)} />
      </FieldShell>
      <ProviderAdapterField context={context} idPrefix={idPrefix} />
      <FieldShell id={fieldId(idPrefix, 'timeout')} label={t('settings.timeout')} info={t('settings.info.timeout')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" type="number" min={1000} max={900000} value={selectedProvider.timeoutMs} onChange={(e) => patchProvider('timeoutMs', Number(e.target.value))} />
      </FieldShell>
    </>
  );
}
