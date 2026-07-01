export interface ProviderSettings {
  [key: string]: unknown;
  adapterId?: string;
  generationEndpoint: string;
  editEndpoint: string;
  responsesEndpoint: string;
  apiKey: string;
  modelId: string;
  authHeaderName: string;
  authScheme: string;
  customHeadersJson: string;
  timeoutMs: number;
  persistApiKey: boolean;
}

export interface GenerationProvider {
  [key: string]: unknown;
  id: string;
  name: string;
  adapterId?: string;
  generationEndpoint: string;
  editEndpoint: string;
  responsesEndpoint: string;
  apiKey: string;
  authHeaderName: string;
  authScheme: string;
  customHeadersJson: string;
  timeoutMs: number;
  persistApiKey: boolean;
}

export interface GenerationModel {
  id: string;
  name: string;
  providerId: string;
  modelId: string;
  notes: string;
}
