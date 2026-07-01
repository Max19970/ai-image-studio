import type { GenerationModel, GenerationProvider } from './providerSettings';

export type InterfaceTheme = string & {};

export interface StudioSettings {
  providers: GenerationProvider[];
  models: GenerationModel[];
  selectedModelId: string;
  interfaceTheme: InterfaceTheme;
  adapterData?: Record<string, unknown>;
}
