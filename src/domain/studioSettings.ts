import type { GenerationModel, GenerationProvider } from './providerSettings';

export type InterfaceTheme = string & {};

export interface StudioSettings {
  providers: GenerationProvider[];
  models: GenerationModel[];
  selectedModelId: string;
  interfaceTheme: InterfaceTheme;
  maxStoredGenerationTasks: number;
  adapterData?: Record<string, unknown>;
}
