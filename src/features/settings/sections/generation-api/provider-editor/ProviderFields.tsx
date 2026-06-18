import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderCustomHeadersField } from '../custom-headers-editor/ProviderCustomHeadersField';
import styles from '../GenerationApiEditor.module.css';
import { ProviderAuthFields } from './ProviderAuthFields';
import { ProviderCoreFields } from './ProviderCoreFields';
import { ProviderEndpointFields } from './ProviderEndpointFields';

export function ProviderFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  return (
    <div className={`${styles.fieldGrid} ${mobile ? styles.mobileFieldStack : ''}`}>
      <ProviderCoreFields context={context} idPrefix={idPrefix} mobile={mobile} />
      <ProviderEndpointFields context={context} idPrefix={idPrefix} mobile={mobile} />
      <ProviderAuthFields context={context} idPrefix={idPrefix} mobile={mobile} />
      <ProviderCustomHeadersField context={context} idPrefix={idPrefix} />
    </div>
  );
}
