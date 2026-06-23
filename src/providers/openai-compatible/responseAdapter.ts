import type { GeneratedImage } from '../../domain/generationTask';
import type { ProviderResponseAdapter } from '../../entities/provider/types';
import {
  compactOpenAiCompatibleInlineImageRaw,
  imageFromOpenAiCompatibleBase64,
  urlImageFromOpenAiCompatibleItem
} from './responseImages';

function collectResponseOutputImages(output: unknown, fallbackFormat: string): GeneratedImage[] {
  if (!Array.isArray(output)) return [];
  const images: GeneratedImage[] = [];

  output.forEach((item: any) => {
    const format = item?.output_format ?? fallbackFormat;
    const result = item?.result ?? item?.image?.b64_json ?? item?.b64_json;
    if (item?.type === 'image_generation_call' && typeof result === 'string' && result) {
      images.push(imageFromOpenAiCompatibleBase64(result, format, 'final', images.length, item));
    }
  });

  return images;
}

function collectResponseCompletedImages(root: any, fallbackFormat: string): GeneratedImage[] {
  if (root?.type !== 'response.completed') return [];
  const format = root?.output_format ?? root?.response?.output_format ?? fallbackFormat;
  return collectResponseOutputImages(root?.response?.output, format);
}

function collectResponseObjectImages(root: any, fallbackFormat: string): GeneratedImage[] {
  const format = root?.output_format ?? fallbackFormat;
  return collectResponseOutputImages(root?.output, format);
}

function collectDataImages(root: any, format: string): GeneratedImage[] {
  if (!Array.isArray(root?.data)) return [];
  const images: GeneratedImage[] = [];
  root.data.forEach((item: any, index: number) => {
    if (item?.b64_json) images.push(imageFromOpenAiCompatibleBase64(item.b64_json, format, 'final', index, item));
    if (item?.url) images.push(urlImageFromOpenAiCompatibleItem(item, index));
  });
  return images;
}

export function collectOpenAiCompatibleImagesFromJson(json: unknown, fallbackFormat = 'png'): GeneratedImage[] {
  const images: GeneratedImage[] = [];
  const root = json as any;
  const format = root?.output_format ?? fallbackFormat;

  images.push(...collectResponseCompletedImages(root, format));
  images.push(...collectResponseObjectImages(root, format));
  images.push(...collectDataImages(root, format));

  if (typeof root?.partial_image_b64 === 'string' && root.partial_image_b64) {
    images.push(imageFromOpenAiCompatibleBase64(root.partial_image_b64, format, 'partial', root.partial_image_index ?? 0, root));
  }

  if (typeof root?.b64_json === 'string' && root.b64_json) {
    const isPartial = String(root?.type ?? '').includes('partial');
    images.push(imageFromOpenAiCompatibleBase64(root.b64_json, format, isPartial ? 'partial' : 'final', root?.partial_image_index ?? 0, root));
  }

  if (root?.image?.b64_json) images.push(imageFromOpenAiCompatibleBase64(root.image.b64_json, format, 'final', 0, root));

  return images;
}

export function parseOpenAiCompatibleSseBlock(block: string): unknown[] {
  const dataLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');

  return dataLines.flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

export function compactOpenAiCompatibleResponseRaw(raw: unknown): unknown {
  return compactOpenAiCompatibleInlineImageRaw(raw);
}

export { imageFromOpenAiCompatibleBase64 };

export const openAiCompatibleResponseAdapter: ProviderResponseAdapter = {
  collectImagesFromJson: collectOpenAiCompatibleImagesFromJson,
  parseSseBlock: parseOpenAiCompatibleSseBlock
};
