import { z } from 'zod';
import { ProviderSchema } from '../types';

export const comfyUiProviderSettingsSchema = ProviderSchema.extend({
  adapterId: z.literal('comfyui').default('comfyui'),
  generationEndpoint: z.string().url().default('http://127.0.0.1:8188'),
  editEndpoint: z.string().optional().default(''),
  responsesEndpoint: z.string().optional().default(''),
  apiKey: z.string().optional().default(''),
  authHeaderName: z.string().optional().default(''),
  authScheme: z.string().optional().default(''),
  customHeadersJson: z.string().optional().default(''),
  timeoutMs: z.number().int().min(1_000).max(1_800_000).default(300_000),
  persistApiKey: z.boolean().optional().default(false)
});
