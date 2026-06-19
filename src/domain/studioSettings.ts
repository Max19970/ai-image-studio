import type { GenerationModel, GenerationProvider } from './providerSettings';

export type InterfaceTheme = 'glass' | 'midnight' | 'ember' | 'meadow' | 'mono';

export interface StudioSettings {
  providers: GenerationProvider[];
  models: GenerationModel[];
  selectedModelId: string;
  interfaceTheme: InterfaceTheme;
  adapterData?: Record<string, unknown>;
}
