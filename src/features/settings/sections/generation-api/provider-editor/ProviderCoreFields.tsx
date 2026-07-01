import { useI18n } from '../../../../../i18n';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderAdapterField } from '../adapter-selector/ProviderAdapterField';
import { fieldId } from '../utils';
import { ProviderSettingsFieldsSection } from './ProviderSettingsFieldsSection';

export function ProviderCoreFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  return (
    <>
      <FieldShell id={fieldId(idPrefix, 'providerName')} label={t('settings.providerName')} info={t('settings.info.providerName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedProvider.name} onChange={(event) => patchProvider('name', event.target.value)} />
      </FieldShell>
      <ProviderAdapterField context={context} idPrefix={idPrefix} />
      <ProviderSettingsFieldsSection context={context} idPrefix={idPrefix} mobile={mobile} section="core" />
    </>
  );
}
