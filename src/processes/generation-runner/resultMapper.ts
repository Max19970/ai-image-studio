import { attachBatchSnapshot, attachSnapshot } from '../../domain/generationSnapshots';
import type { GeneratedImage, GenerationRequestSnapshot } from '../../domain/generationTask';

export interface RunnerImageResult {
  images: GeneratedImage[];
  raw: unknown;
}

function deliveredFinalImages(images: GeneratedImage[]): GeneratedImage[] {
  return images.filter((image) => image.kind === 'final');
}

export function countStreamedFinalImages(images: GeneratedImage[]): number {
  return deliveredFinalImages(images).length;
}

function sameLiveImageSlot(left: GeneratedImage, right: GeneratedImage): boolean {
  return (left.batchItemId ?? null) === (right.batchItemId ?? null) && left.index === right.index;
}

export function upsertLiveStreamingImage(current: GeneratedImage[], next: GeneratedImage): GeneratedImage[] {
  if (next.kind === 'partial') {
    return [...current.filter((image) => image.kind !== 'partial' || (image.batchItemId ?? null) !== (next.batchItemId ?? null)), next]
      .sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
  }

  return [...current.filter((image) => image.kind !== 'partial' || !sameLiveImageSlot(image, next)), next]
    .sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
}

export function replaceLiveStreamingImagesForBatchItem(current: GeneratedImage[], itemId: string, next: GeneratedImage): GeneratedImage[] {
  return upsertLiveStreamingImage(current.filter((image) => image.batchItemId !== itemId || image.kind !== 'partial' || !sameLiveImageSlot(image, next)), next);
}

export function removeLivePartialImagesForBatchItem(current: GeneratedImage[], itemId: string): GeneratedImage[] {
  return current.filter((image) => image.batchItemId !== itemId || image.kind !== 'partial');
}

export function mapSingleGenerationFinalImages(args: {
  result: RunnerImageResult;
  request: GenerationRequestSnapshot;
  taskId: string;
  streamed: boolean;
}): GeneratedImage[] | undefined {
  const images = args.streamed ? deliveredFinalImages(args.result.images) : args.result.images;
  if (args.streamed && images.length === 0) return undefined;
  return attachSnapshot(images, args.request, args.taskId);
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
  const images = args.streamed ? deliveredFinalImages(args.result.images) : args.result.images;
  if (args.streamed && images.length === 0) return [];
  return attachBatchSnapshot(
    images,
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
  if (args.image.kind === 'partial') {
    return {
      ...args.image,
      index: args.globalStartIndex + args.image.index,
      taskId: args.taskId,
      batchItemId: args.batchItemId,
      batchItemIndex: args.batchItemIndex,
      request: args.request
    };
  }

  return attachBatchSnapshot(
    [args.image],
    args.request,
    args.taskId,
    args.batchItemId,
    args.batchItemIndex,
    args.globalStartIndex
  )[0];
}
