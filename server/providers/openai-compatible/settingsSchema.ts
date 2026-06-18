import { z } from 'zod';
import { ProviderSchema } from '../types';

export const openAiCompatibleProviderSettingsSchema = ProviderSchema.extend({
  adapterId: z.literal('openai-compatible').default('openai-compatible')
});
