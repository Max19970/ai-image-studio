import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import { resolveModeImageSize } from '../../provider/valueConstraints';

export const isBlank = (value: unknown) => value === undefined || value === null || value === '';
export const isAuto = (value: unknown) => value === 'auto' || isBlank(value);

export function shouldSendOutputFormat(format: unknown) {
  // PNG is the de-facto default for most OpenAI-compatible image endpoints.
  // Sending it explicitly breaks some proxies, while omitting it keeps the
  // request compatible and still returns PNG on the common path.
  return typeof format === 'string' && format !== '' && format !== 'png';
}

export function getOpenAiCompatibleSize(
  params: ImageParams,
  providerMode?: ProviderGenerationModeDefinition | null
): string | undefined {
  if (params.sizeMode === 'auto') return 'auto';
  if (params.sizeMode === 'preset') return params.sizePreset || undefined;
  const size = resolveModeImageSize(params.width, params.height, providerMode, { width: params.width, height: params.height });
  return `${size.width}x${size.height}`;
}

export function parseOpenAiCompatibleRawJson(rawJson: string): Record<string, unknown> {
  const trimmed = rawJson.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Raw JSON должен быть объектом, например { "seed": 123 }.');
  }
  return parsed as Record<string, unknown>;
}
