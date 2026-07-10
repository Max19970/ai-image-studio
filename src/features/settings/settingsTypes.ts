import type { Dispatch, SetStateAction } from 'react';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { ComfyUiLoraRegistration, ComfyUiResourceCacheEntry, ComfyUiSettingsData } from '../../domain/comfyUiSettings';
import type { InterfaceTheme, StudioSettings } from '../../domain/studioSettings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { SettingsCommands } from '../../interface/context/commands';
import type { Locale } from '../../i18n';

export type SettingsTab = 'interface' | 'generationApi' | 'integrations' | (string & {});
export type ApiFocus = 'providers' | 'models' | 'comfyui' | (string & {});
export type SettingsSectionVariant = 'desktop' | 'mobile';

export type SettingsSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export interface SettingsNavigationContextSlice {
  activeTab: SettingsTab;
  variant: SettingsSectionVariant;
}

export interface SettingsLocaleContextSlice {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export interface SettingsInfoContextSlice {
  activeInfo: string | null;
  setActiveInfo: (id: string | null) => void;
}

export interface SettingsAppearanceContextSlice {
  activeTheme: InterfaceTheme;
  selectTheme: (theme: InterfaceTheme) => void;
  maxStoredGenerationTasks: number;
  setMaxStoredGenerationTasks: (value: number) => void;
  draft: StudioSettings;
}

export interface SettingsGenerationApiContextSlice {
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
  addProvider: () => void;
  removeProvider: () => void;
  addModel: () => void;
  removeModel: () => void;
  selectModel: (model: GenerationModel) => void;
  patchProvider: (key: string, value: unknown) => void;
  patchModel: (key: keyof GenerationModel, value: GenerationModel[keyof GenerationModel]) => void;
  firstModelForProvider: (settings: StudioSettings, providerId: string) => GenerationModel | null;
}

export interface SettingsProviderProbeContextSlice {
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  probeError: string | null;
}

export interface SettingsComfyUiContextSlice {
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
}

export interface SettingsCommandsContextSlice {
  commands: SettingsCommands;
}

export type SettingsSectionContext =
  SettingsNavigationContextSlice &
  SettingsLocaleContextSlice &
  SettingsInfoContextSlice &
  SettingsAppearanceContextSlice &
  SettingsGenerationApiContextSlice &
  SettingsProviderProbeContextSlice &
  SettingsComfyUiContextSlice &
  SettingsCommandsContextSlice;

export type SettingsGenerationApiDraftContext = SettingsGenerationApiContextSlice & SettingsComfyUiContextSlice;

export interface SettingsSectionContextInput extends Omit<SettingsNavigationContextSlice, 'variant'>, SettingsInfoContextSlice, SettingsAppearanceContextSlice {
  generationApi: SettingsGenerationApiDraftContext;
  probingProviderId: string | null;
  quickCheckingProviderId: string | null;
  probeError: string | null;
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
