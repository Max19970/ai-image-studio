import type { ReactNode } from 'react';
import type { GenerationProvider } from '../../../../../domain/providerSettings';
import type { ProviderAdapterSettingsField, ProviderAdapterSettingsFieldKind } from '../../../../../entities/provider/types';
import type { SettingsSectionContext } from '../../../settingsTypes';

export interface ProviderSettingsFieldRenderContext {
  context: SettingsSectionContext;
  field: ProviderAdapterSettingsField;
  provider: GenerationProvider;
  idPrefix: string;
}

export interface ProviderSettingsFieldRendererDescriptor {
  kind: ProviderAdapterSettingsFieldKind;
  render: (context: ProviderSettingsFieldRenderContext) => ReactNode;
}
