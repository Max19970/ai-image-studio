import type { GeneratedImage } from '../../../src/domain/generationTask';

const LARGE_INLINE_IMAGE_KEYS = new Set(['b64_json', 'partial_image_b64', 'result']);

export function compactOpenAiCompatibleInlineImageRaw(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((item) => compactOpenAiCompatibleInlineImageRaw(item, depth + 1));

  const source = value as Record<string, unknown>;
  const compacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    compacted[key] = LARGE_INLINE_IMAGE_KEYS.has(key) && typeof entry === 'string'
      ? `[omitted inline image payload: ${entry.length} chars]`
      : compactOpenAiCompatibleInlineImageRaw(entry, depth + 1);
  }
  return compacted;
}

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
    raw: compactOpenAiCompatibleInlineImageRaw(raw)
  };
}

export function urlImageFromOpenAiCompatibleItem(item: any, index: number): GeneratedImage {
  return {
    id: crypto.randomUUID(),
    src: item.url,
    format: 'url',
    kind: 'final',
    index,
    createdAt: Date.now(),
    raw: item
  };
}
