import type { GeneratedImage, GenerationRequestSnapshot, GenerationTask } from './generationTask';

export function isBrowserObjectUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('blob:');
}

function addObjectUrl(urls: Set<string>, value: unknown) {
  if (isBrowserObjectUrl(value)) urls.add(value);
}

export function collectRequestSnapshotObjectUrls(snapshot: GenerationRequestSnapshot | null | undefined): Set<string> {
  const urls = new Set<string>();
  if (!snapshot) return urls;
  snapshot.attachments.forEach((attachment) => addObjectUrl(urls, attachment.previewUrl));
  return urls;
}

function collectImageObjectUrls(image: GeneratedImage, urls: Set<string>) {
  addObjectUrl(urls, image.src);
  addObjectUrl(urls, image.thumbnailSrc);
  collectRequestSnapshotObjectUrls(image.request).forEach((url) => urls.add(url));
}

export function collectGenerationTaskObjectUrls(task: GenerationTask): Set<string> {
  const urls = collectRequestSnapshotObjectUrls(task.request);
  task.images.forEach((image) => collectImageObjectUrls(image, urls));
  task.batch?.items.forEach((item) => {
    collectRequestSnapshotObjectUrls(item.request).forEach((url) => urls.add(url));
    item.images.forEach((image) => collectImageObjectUrls(image, urls));
  });
  return urls;
}

export function collectGenerationTasksObjectUrls(tasks: readonly GenerationTask[]): Set<string> {
  const urls = new Set<string>();
  tasks.forEach((task) => collectGenerationTaskObjectUrls(task).forEach((url) => urls.add(url)));
  return urls;
}

export function revokeBrowserObjectUrls(urls: Iterable<string>) {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  for (const url of urls) URL.revokeObjectURL(url);
}
