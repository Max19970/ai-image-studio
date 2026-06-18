export function parseIntegerOption(args, name, fallback) {
  const prefix = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  const value = Number(match.slice(prefix.length));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function createDataUrl(seed, byteLength, mime = 'image/png') {
  const source = Buffer.alloc(Math.max(1, byteLength), seed).toString('base64');
  return `data:${mime};base64,${source}`;
}

function createImage(taskIndex, imageIndex, imageBytes, thumbnailBytes) {
  return {
    id: `task-${taskIndex}-image-${imageIndex}`,
    src: createDataUrl(65 + ((taskIndex + imageIndex) % 26), imageBytes, 'image/png'),
    thumbnailSrc: createDataUrl(97 + ((taskIndex + imageIndex) % 26), thumbnailBytes, 'image/webp'),
    format: 'png',
    kind: 'final',
    index: imageIndex,
    createdAt: 1_700_000_000_000 + taskIndex * 1000 + imageIndex
  };
}

function createBatchItem(taskIndex, itemIndex, imagesPerItem, imageBytes, thumbnailBytes) {
  return {
    id: `task-${taskIndex}-batch-item-${itemIndex}`,
    index: itemIndex,
    prompt: `Batch prompt ${taskIndex}/${itemIndex}`,
    status: 'succeeded',
    images: Array.from({ length: imagesPerItem }, (_, imageIndex) => createImage(taskIndex, itemIndex * 100 + imageIndex, imageBytes, thumbnailBytes))
  };
}

export function createGenerationTaskHistoryFixture(options = {}) {
  const taskCount = options.taskCount ?? 120;
  const imagesPerTask = options.imagesPerTask ?? 2;
  const batchItemsPerTask = options.batchItemsPerTask ?? 0;
  const batchImagesPerItem = options.batchImagesPerItem ?? 0;
  const imageBytes = options.imageBytes ?? 4096;
  const thumbnailBytes = options.thumbnailBytes ?? Math.max(128, Math.floor(imageBytes / 8));
  const now = 1_700_000_000_000;

  return Array.from({ length: taskCount }, (_, taskIndex) => {
    const batchItems = Array.from({ length: batchItemsPerTask }, (_, itemIndex) => createBatchItem(taskIndex, itemIndex, batchImagesPerItem, imageBytes, thumbnailBytes));
    return {
      id: `fixture-task-${taskIndex}`,
      kind: batchItems.length ? 'batch' : 'single',
      status: taskIndex % 17 === 0 ? 'failed' : 'succeeded',
      createdAt: now + taskIndex * 1000,
      updatedAt: now + taskIndex * 1000 + 500,
      request: {
        createdAt: now + taskIndex * 1000,
        mode: batchItems.length ? 'edit' : 'generate',
        prompt: `Storage fixture prompt ${taskIndex}`,
        endpoint: batchItems.length ? '/api/edit' : '/api/generate',
        providerLabel: 'Fixture Provider',
        model: 'fixture-model',
        modelLabel: 'Fixture Model',
        payload: { prompt: `Storage fixture prompt ${taskIndex}` },
        warnings: [],
        attachments: [],
        params: {}
      },
      images: Array.from({ length: imagesPerTask }, (_, imageIndex) => createImage(taskIndex, imageIndex, imageBytes, thumbnailBytes)),
      batch: batchItems.length ? { total: batchItems.length, completed: batchItems.length, failed: 0, items: batchItems } : undefined
    };
  });
}
