import { useI18n } from '../../../../../../i18n';
import { FieldShell } from '../../../../components/SettingsControls';
import type { ProviderSettingsFieldRendererDescriptor } from '../providerSettingsFieldRendererTypes';
import { providerFieldDomId, providerFieldInfoKey, providerFieldLabel, stringProviderSetting } from '../providerSettingsFieldHelpers';

export const textProviderSettingsFieldRenderer = {
  kind: 'text',
  render({ context, field, provider, idPrefix }) {
    const { t } = useI18n();
    return (
      <FieldShell id={providerFieldDomId(idPrefix, field)} label={providerFieldLabel(field)} info={t(providerFieldInfoKey(field))} activeInfo={context.activeInfo} setActiveInfo={context.setActiveInfo} wide={field.wide}>
        <input className="field-input" value={stringProviderSetting(provider, field)} onChange={(event) => context.patchProvider(field.key, event.target.value)} placeholder={field.placeholder} />
      </FieldShell>
    );
  }
} satisfies ProviderSettingsFieldRendererDescriptor;

export const endpointProviderSettingsFieldRenderer = {
  ...textProviderSettingsFieldRenderer,
  kind: 'endpoint'
} satisfies ProviderSettingsFieldRendererDescriptor;
