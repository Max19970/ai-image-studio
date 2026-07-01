import { describeApiError, fetchProxy } from './common';

export interface GenerationArchiveImageRef {
  taskId: string;
  imageId?: string;
  storageAssetKey?: string;
  filename?: string;
}

async function downloadGenerationArchive(body: { taskIds?: string[]; imageRefs?: GenerationArchiveImageRef[]; filename: string }): Promise<void> {
  const response = await fetchProxy('/api/storage/generation-task-downloads/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const raw = await response.text();
    let data: unknown = raw;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // keep raw response
    }
    throw new Error(describeApiError(data, raw || response.statusText || `HTTP ${response.status}`));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = body.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadGenerationTasksArchive(taskIds: string[], filename = 'image-studio-selection.zip'): Promise<void> {
  await downloadGenerationArchive({ taskIds, filename });
}

export async function downloadGenerationImagesArchive(imageRefs: GenerationArchiveImageRef[], filename = 'image-studio-images.zip'): Promise<void> {
  await downloadGenerationArchive({ imageRefs, filename });
}
