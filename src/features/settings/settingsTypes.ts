import type { Dispatch, SetStateAction } from 'react';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { ComfyUiLoraRegistration, ComfyUiResourceCacheEntry, ComfyUiSettingsData } from '../../domain/comfyUiSettings';
import type { InterfaceTheme, StudioSettings } from '../../domain/studioSettings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { SettingsCommands } from '../../interface/context/commands';
import type { Locale } from '../../i18n';

// Keep this union at the settings-tab level only. Concrete integration state stays inside integration feature owners.
export type SettingsTab = 'interface' | 'generationApi' | 'integrations';
export type ApiFocus = 'providers' | 'models' | 'comfyui';
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

  comfyUiData: ComfyUiSettingsData;
  comfyUiProviders: GenerationProvider[];
  selectedComfyUiProviderId: string;
  selectedComfyUiProvider: GenerationProvider | null;
  setSelectedComfyUiProviderId: Dispatch<SetStateAction<string>>;
  comfyUiCheckpointCache: ComfyUiResourceCacheEntry | null;
  comfyUiLoraCache: ComfyUiResourceCacheEntry | null;
  comfyUiSamplerCache: ComfyUiResourceCacheEntry | null;
  comfyUiSchedulerCache: ComfyUiResourceCacheEntry | null;
  comfyUiUpscaleModelCache: ComfyUiResourceCacheEntry | null;
  comfyUiResourcesLoading: boolean;
  comfyUiResourcesError: string | null;
  refreshComfyUiResources: (providerId?: string) => Promise<void>;
  addComfyUiProvider: () => void;
  addComfyUiLora: () => void;
  removeComfyUiLora: (id: string) => void;
  patchComfyUiLora: <K extends keyof ComfyUiLoraRegistration>(id: string, key: K, value: ComfyUiLoraRegistration[K]) => void;
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
