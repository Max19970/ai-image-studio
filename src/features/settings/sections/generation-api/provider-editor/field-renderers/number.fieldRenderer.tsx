import { useI18n } from '../../../../../../i18n';
import { FieldShell } from '../../../../components/SettingsControls';
import type { ProviderSettingsFieldRendererDescriptor } from '../providerSettingsFieldRendererTypes';
import { numberProviderSetting, providerFieldDomId, providerFieldInfoKey, providerFieldLabel } from '../providerSettingsFieldHelpers';

export const numberProviderSettingsFieldRenderer = {
  kind: 'number',
  render({ context, field, provider, idPrefix }) {
    const { t } = useI18n();
    return (
      <FieldShell id={providerFieldDomId(idPrefix, field)} label={providerFieldLabel(field)} info={t(providerFieldInfoKey(field))} activeInfo={context.activeInfo} setActiveInfo={context.setActiveInfo} wide={field.wide}>
        <input className="field-input" type="number" min={field.min} max={field.max} step={field.step} value={numberProviderSetting(provider, field)} onChange={(event) => context.patchProvider(field.key, Number(event.target.value))} />
      </FieldShell>
    );
  }
} satisfies ProviderSettingsFieldRendererDescriptor;
