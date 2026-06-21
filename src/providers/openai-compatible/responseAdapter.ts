import type { GeneratedImage } from '../../domain/generationTask';
import type { ProviderResponseAdapter } from '../../entities/provider/types';

export function imageFromOpenAiCompatibleBase64(
  base64: string,
  format = 'png',
  kind: 'final' | 'partial' = 'final',
  index = 0,
  raw?: unknown
): GeneratedImage {
  const mime = format === 'jpg' ? 'jpeg' : format;
  return {
    id: crypto.randomUUID(),
    src: `data:image/${mime};base64,${base64}`,
    format: mime,
    kind,
    index,
    createdAt: Date.now(),
    raw
  };
}

function collectResponseCompletedImages(root: any, fallbackFormat: string): GeneratedImage[] {
  if (root?.type !== 'response.completed' || !Array.isArray(root?.response?.output)) return [];
  const format = root?.output_format ?? fallbackFormat;
  const images: GeneratedImage[] = [];

  root.response.output.forEach((item: any) => {
    const result = item?.result ?? item?.image?.b64_json ?? item?.b64_json;
    if (item?.type === 'image_generation_call' && typeof result === 'string' && result) {
      images.push(imageFromOpenAiCompatibleBase64(result, format, 'final', images.length, item));
    }
  });

  return images;
}

export function collectOpenAiCompatibleImagesFromJson(json: unknown, fallbackFormat = 'png'): GeneratedImage[] {
  const images: GeneratedImage[] = [];
  const root = json as any;
  const format = root?.output_format ?? fallbackFormat;

  images.push(...collectResponseCompletedImages(root, format));

  if (Array.isArray(root?.data)) {
    root.data.forEach((item: any, index: number) => {
      if (item?.b64_json) images.push(imageFromOpenAiCompatibleBase64(item.b64_json, format, 'final', index, item));
      if (item?.url) {
        images.push({ id: crypto.randomUUID(), src: item.url, format: 'url', kind: 'final', index, createdAt: Date.now(), raw: item });
      }
    });
  }

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

export const openAiCompatibleResponseAdapter: ProviderResponseAdapter = {
  collectImagesFromJson: collectOpenAiCompatibleImagesFromJson,
  parseSseBlock: parseOpenAiCompatibleSseBlock
};
