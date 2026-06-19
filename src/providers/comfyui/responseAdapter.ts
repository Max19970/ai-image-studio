import type { ProviderResponseAdapter } from '../../entities/provider/types';
import { collectOpenAiCompatibleImagesFromJson, parseOpenAiCompatibleSseBlock } from '../openai-compatible/responseAdapter';

export const comfyUiResponseAdapter: ProviderResponseAdapter = {
  collectImagesFromJson: collectOpenAiCompatibleImagesFromJson,
  parseSseBlock: parseOpenAiCompatibleSseBlock
};
