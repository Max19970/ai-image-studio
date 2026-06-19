export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type Quality = '' | 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd';
export type Background = '' | 'auto' | 'opaque' | 'transparent';
export type Moderation = '' | 'auto' | 'low';
export type ResponseFormat = '' | 'b64_json' | 'url';
export type InputFidelity = '' | 'low' | 'high';

export type ProviderParamsBySurface = Record<string, Record<string, unknown>>;

export interface ImageParams {
  prompt: string;
  n: number;
  sizeMode: 'auto' | 'preset' | 'custom';
  sizePreset: string;
  width: number;
  height: number;
  quality: Quality;
  background: Background;
  moderation: Moderation;
  outputFormat: OutputFormat;
  outputCompression: number;
  stream: boolean;
  partialImages: number;
  responseFormat: ResponseFormat;
  inputFidelity: InputFidelity;
  user: string;
  style: '' | 'vivid' | 'natural';
  retryAttempts: number;
  retryDelaySeconds: number;
  rawJson: string;
  includeModel: boolean;
  includeN: boolean;
  includeQuality: boolean;
  includeBackground: boolean;
  includeModeration: boolean;
  includeOutputFormat: boolean;
  includeOutputCompression: boolean;
  includeStream: boolean;
  includePartialImages: boolean;
  includeResponseFormat: boolean;
  includeInputFidelity: boolean;
  includeUser: boolean;
  includeStyle: boolean;
  providerParams?: ProviderParamsBySurface;
}
