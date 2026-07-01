import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderSettingsFieldsSection } from '../provider-editor/ProviderSettingsFieldsSection';

export function ProviderCustomHeadersField({ context, idPrefix }: { context: SettingsSectionContext; idPrefix: string }) {
  return <ProviderSettingsFieldsSection context={context} idPrefix={idPrefix} mobile={false} section="advanced" />;
}
