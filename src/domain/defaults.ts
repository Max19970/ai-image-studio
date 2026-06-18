import defaultsData from '../data/studio.defaults.json';
import type { CapabilityKey, GenerationModel, GenerationProvider, ImageParams, ProviderSettings, StudioSettings } from './types';

type DefaultsFile = {
  providerSettings: ProviderSettings;
  generationProvider: GenerationProvider;
  generationModel: GenerationModel;
  studioSettings: Pick<StudioSettings, 'selectedModelId' | 'interfaceTheme'>;
  imageParams: ImageParams;
  sizePresets: string[];
  capabilities: {
    order: CapabilityKey[];
    labels: Record<CapabilityKey, string>;
  };
  gptImage2Notes: string[];
};

const data = defaultsData as DefaultsFile;

export const defaultProviderSettings: ProviderSettings = data.providerSettings;
export const defaultGenerationProvider: GenerationProvider = data.generationProvider;
export const defaultGenerationModel: GenerationModel = data.generationModel;

export const defaultStudioSettings: StudioSettings = {
  providers: [defaultGenerationProvider],
  models: [defaultGenerationModel],
  selectedModelId: data.studioSettings.selectedModelId,
  interfaceTheme: data.studioSettings.interfaceTheme
};

export const defaultImageParams: ImageParams = data.imageParams;
export const sizePresets = data.sizePresets;
export const capabilityOrder: CapabilityKey[] = data.capabilities.order;
export const capabilityLabels: Record<CapabilityKey, string> = data.capabilities.labels;
export const gptImage2Notes = data.gptImage2Notes;
