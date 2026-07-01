import { useI18n } from '../../../../../../i18n';
import { FieldShell } from '../../../../components/SettingsControls';
import type { ProviderSettingsFieldRendererDescriptor } from '../providerSettingsFieldRendererTypes';
import { providerFieldDomId, providerFieldInfoKey, providerFieldLabel, stringProviderSetting } from '../providerSettingsFieldHelpers';

export const secretProviderSettingsFieldRenderer = {
  kind: 'secret',
  render({ context, field, provider, idPrefix }) {
    const { t } = useI18n();
    return (
      <FieldShell id={providerFieldDomId(idPrefix, field)} label={providerFieldLabel(field)} info={t(providerFieldInfoKey(field))} activeInfo={context.activeInfo} setActiveInfo={context.setActiveInfo} wide={field.wide ?? true}>
        <input className="field-input" type="password" value={stringProviderSetting(provider, field)} onChange={(event) => context.patchProvider(field.key, event.target.value)} placeholder={field.placeholder} autoComplete="off" />
      </FieldShell>
    );
  }
} satisfies ProviderSettingsFieldRendererDescriptor;
