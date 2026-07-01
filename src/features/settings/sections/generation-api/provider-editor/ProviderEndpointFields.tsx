import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderSettingsFieldsSection } from './ProviderSettingsFieldsSection';

export function ProviderEndpointFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  return <ProviderSettingsFieldsSection context={context} idPrefix={idPrefix} mobile={mobile} section="endpoints" />;
}
