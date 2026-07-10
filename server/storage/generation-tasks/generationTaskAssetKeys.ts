export function generationTaskImageAssetKey(taskId: string, imageId: string): string {
  return `${taskId}/image/${imageId}/full`;
}

export function generationTaskImageThumbnailKey(taskId: string, imageId: string): string {
  return `${taskId}/image/${imageId}/thumbnail`;
}

export function generationBatchImageAssetKey(taskId: string, batchItemId: string, imageId: string): string {
  return `${taskId}/batch/${batchItemId}/image/${imageId}/full`;
}

export function generationBatchImageThumbnailKey(taskId: string, batchItemId: string, imageId: string): string {
  return `${taskId}/batch/${batchItemId}/image/${imageId}/thumbnail`;
}
