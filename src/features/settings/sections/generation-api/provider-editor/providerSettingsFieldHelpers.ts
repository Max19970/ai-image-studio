import type { GenerationProvider } from '../../../../../domain/providerSettings';
import type { ProviderAdapterSettingsField } from '../../../../../entities/provider/types';
import { fieldId } from '../utils';

export function providerFieldDomId(idPrefix: string, field: ProviderAdapterSettingsField) {
  return fieldId(idPrefix, field.key.replace(/[^a-z0-9_-]/gi, '-'));
}

export function providerFieldLabel(field: ProviderAdapterSettingsField) {
  return field.label;
}

export function providerFieldInfoKey(field: ProviderAdapterSettingsField) {
  return field.infoKey ?? `settings.info.providerField.${field.key}`;
}

export function readProviderSetting(provider: GenerationProvider, field: ProviderAdapterSettingsField) {
  return provider[field.key];
}

export function stringProviderSetting(provider: GenerationProvider, field: ProviderAdapterSettingsField) {
  const value = readProviderSetting(provider, field);
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function numberProviderSetting(provider: GenerationProvider, field: ProviderAdapterSettingsField) {
  const value = Number(readProviderSetting(provider, field));
  return Number.isFinite(value) ? value : 0;
}

export function booleanProviderSetting(provider: GenerationProvider, field: ProviderAdapterSettingsField) {
  return Boolean(readProviderSetting(provider, field));
}
