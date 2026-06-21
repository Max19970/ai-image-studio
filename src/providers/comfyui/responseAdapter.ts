import type { GenerationProgress } from '../../domain/generationTask';
import type { ProviderResponseAdapter } from '../../entities/provider/types';
import {
  collectOpenAiCompatibleImagesFromJson,
  imageFromOpenAiCompatibleBase64,
  parseOpenAiCompatibleSseBlock
} from '../openai-compatible/responseAdapter';

function normalizePercent(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeNullableNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function collectComfyUiImagesFromJson(json: unknown) {
  const root = json as any;
  if (root?.type === 'comfyui.preview' && typeof root?.b64_json === 'string' && root.b64_json) {
    return [imageFromOpenAiCompatibleBase64(root.b64_json, root.output_format ?? 'png', 'partial', root.partial_image_index ?? 0, root)];
  }
  return collectOpenAiCompatibleImagesFromJson(json, root?.output_format ?? 'png');
}

export function collectComfyUiProgressFromJson(json: unknown): GenerationProgress | null {
  const root = json as any;
  const progress = root?.progress;
  if (!progress || typeof progress !== 'object') return null;
  return {
    providerAdapterId: 'comfyui',
    percent: normalizePercent(progress.percent),
    step: normalizeNullableNumber(progress.step),
    maxSteps: normalizeNullableNumber(progress.maxSteps),
    stage: typeof progress.stage === 'string' ? progress.stage : null,
    nodeId: typeof progress.nodeId === 'string' ? progress.nodeId : null,
    message: typeof progress.message === 'string' ? progress.message : null,
    updatedAt: Number.isFinite(Number(progress.updatedAt)) ? Number(progress.updatedAt) : Date.now()
  };
}

export function collectComfyUiErrorFromJson(json: unknown): string | null {
  const root = json as any;
  if (root?.type !== 'comfyui.error') return null;
  return String(root?.error?.message || root?.message || 'ComfyUI stream failed.');
}

export const comfyUiResponseAdapter: ProviderResponseAdapter = {
  collectImagesFromJson: collectComfyUiImagesFromJson,
  collectProgressFromJson: collectComfyUiProgressFromJson,
  collectErrorFromJson: collectComfyUiErrorFromJson,
  parseSseBlock: parseOpenAiCompatibleSseBlock
};
