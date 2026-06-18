import { attachBatchSnapshot, attachSnapshot } from '../../domain/generationSnapshots';
import type { GeneratedImage, GenerationRequestSnapshot } from '../../domain/generationTask';

export interface RunnerImageResult {
  images: GeneratedImage[];
  raw: unknown;
}

export function mapSingleGenerationFinalImages(args: {
  result: RunnerImageResult;
  request: GenerationRequestSnapshot;
  taskId: string;
  streamed: boolean;
}): GeneratedImage[] | undefined {
  if (args.streamed) return undefined;
  return attachSnapshot(args.result.images, args.request, args.taskId);
}

export function mapBatchGenerationFinalImages(args: {
  result: RunnerImageResult;
  request: GenerationRequestSnapshot;
  taskId: string;
  batchItemId: string;
  batchItemIndex: number;
  globalStartIndex: number;
  streamed: boolean;
}): GeneratedImage[] {
  if (args.streamed) return [];
  return attachBatchSnapshot(
    args.result.images,
    args.request,
    args.taskId,
    args.batchItemId,
    args.batchItemIndex,
    args.globalStartIndex
  );
}

export function mapBatchStreamingImage(args: {
  image: GeneratedImage;
  request: GenerationRequestSnapshot;
  taskId: string;
  batchItemId: string;
  batchItemIndex: number;
  globalStartIndex: number;
}): GeneratedImage {
  return attachBatchSnapshot(
    [args.image],
    args.request,
    args.taskId,
    args.batchItemId,
    args.batchItemIndex,
    args.globalStartIndex
  )[0];
}
