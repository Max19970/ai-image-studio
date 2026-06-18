import type { Dispatch, SetStateAction } from 'react';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { InterfaceTheme, StudioSettings } from '../../domain/studioSettings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { SettingsCommands } from '../../interface/context/commands';
import type { Locale } from '../../i18n';

export type SettingsTab = 'interface' | 'generationApi';
export type ApiFocus = 'providers' | 'models';
export type SettingsSectionVariant = 'desktop' | 'mobile';

export type SettingsSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export interface SettingsSectionContext {
  activeTab: SettingsTab;
  variant: SettingsSectionVariant;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  activeInfo: string | null;
  setActiveInfo: (id: string | null) => void;
  activeTheme: InterfaceTheme;
  selectTheme: (theme: InterfaceTheme) => void;

  draft: StudioSettings;
  apiFocus: ApiFocus;
  setApiFocus: Dispatch<SetStateAction<ApiFocus>>;
  selectedProvider: GenerationProvider | null;
  selectedModel: GenerationModel | null;
  selectedProviderId: string;
  selectedModelId: string;
  setSelectedProviderId: Dispatch<SetStateAction<string>>;
  setSelectedModelId: Dispatch<SetStateAction<string>>;
  modelsForSelectedProvider: GenerationModel[];
  providerOptions: SettingsSelectOption[];
  probeModel: GenerationModel | null;
  quickResult: ProviderQuickCheckResult | null;
  showReport: ProviderProbeReport | null;
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  probeError: string | null;
  addProvider: () => void;
  removeProvider: () => void;
  addModel: () => void;
  removeModel: () => void;
  selectModel: (model: GenerationModel) => void;
  patchProvider: (key: keyof GenerationProvider, value: GenerationProvider[keyof GenerationProvider]) => void;
  patchModel: (key: keyof GenerationModel, value: GenerationModel[keyof GenerationModel]) => void;
  firstModelForProvider: (settings: StudioSettings, providerId: string) => GenerationModel | null;
  commands: SettingsCommands;
}

export interface SettingsLayoutContext {
  activeTab: SettingsTab;
  setActiveTab: Dispatch<SetStateAction<SettingsTab>>;
  saved: boolean;
  isDirty: boolean;
  onReset: () => void;
  onSave: () => void;
  sectionContext: Omit<SettingsSectionContext, 'variant'>;
}

export interface SettingsLayoutZoneContext extends SettingsLayoutContext {
  variant: SettingsSectionVariant;
}
