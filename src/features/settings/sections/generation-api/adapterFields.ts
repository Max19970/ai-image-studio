import { getProviderAdapterForSettings } from '../../../../entities/provider/registry';
import type { ProviderAdapterSettingsField } from '../../../../entities/provider/types';
import type { GenerationProvider } from '../../../../domain/providerSettings';

export function adapterSettingsFieldsForProvider(provider: GenerationProvider | null): ProviderAdapterSettingsField[] {
  return getProviderAdapterForSettings(provider).settingsFields;
}

export function hasAdapterSettingsField(provider: GenerationProvider | null, key: ProviderAdapterSettingsField['key']): boolean {
  return adapterSettingsFieldsForProvider(provider).some((field) => field.key === key);
}

export function labelForAdapterSettingsField(provider: GenerationProvider | null, key: ProviderAdapterSettingsField['key'], fallback: string): string {
  return adapterSettingsFieldsForProvider(provider).find((field) => field.key === key)?.label ?? fallback;
}
