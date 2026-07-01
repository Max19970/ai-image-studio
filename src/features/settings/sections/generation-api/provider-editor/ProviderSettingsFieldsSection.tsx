import type { ProviderAdapterSettingsSection } from '../../../../../entities/provider/types';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { adapterSettingsFieldsForProvider } from '../adapterFields';
import { providerSettingsFieldRenderersByKind } from './providerSettingsFieldRendererRegistry';

export function ProviderSettingsFieldsSection({
  context,
  idPrefix,
  mobile,
  section
}: {
  context: SettingsSectionContext;
  idPrefix: string;
  mobile: boolean;
  section: ProviderAdapterSettingsSection;
}) {
  const { selectedProvider } = context;
  if (!selectedProvider) return null;

  const fields = adapterSettingsFieldsForProvider(selectedProvider)
    .filter((field) => (field.section ?? 'advanced') === section)
    .map((field) => {
      const renderer = providerSettingsFieldRenderersByKind.get(field.kind);
      return renderer ? <div key={field.key}>{renderer.render({ context, field, provider: selectedProvider, idPrefix })}</div> : null;
    })
    .filter(Boolean);

  if (!fields.length) return null;

  return mobile ? <div className={`${styles.fieldGrid} ${styles.mobileFieldStack}`}>{fields}</div> : <>{fields}</>;
}
