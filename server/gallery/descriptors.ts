export const galleryItemKindDescriptors = {
  task: { id: 'task', canContainChildren: false },
  folder: { id: 'folder', canContainChildren: true }
} as const;

export type GalleryItemKind = keyof typeof galleryItemKindDescriptors;

export const galleryPasteOperationDescriptors = {
  move: { id: 'move', duplicatesTasks: false, preservesSource: false },
  'link-copy': { id: 'link-copy', duplicatesTasks: false, preservesSource: true },
  'deep-copy': { id: 'deep-copy', duplicatesTasks: true, preservesSource: true }
} as const;

export type GalleryPasteOperation = keyof typeof galleryPasteOperationDescriptors;

export function isGalleryItemKind(value: unknown): value is GalleryItemKind {
  return typeof value === 'string' && value in galleryItemKindDescriptors;
}

export function isGalleryPasteOperation(value: unknown): value is GalleryPasteOperation {
  return typeof value === 'string' && value in galleryPasteOperationDescriptors;
}

export function galleryItemKindDescriptor(kind: GalleryItemKind) {
  return galleryItemKindDescriptors[kind];
}

export function galleryPasteOperationDescriptor(operation: GalleryPasteOperation) {
  return galleryPasteOperationDescriptors[operation];
}

export function galleryItemCanContainChildren(kind: GalleryItemKind): boolean {
  return galleryItemKindDescriptor(kind).canContainChildren;
}

export function galleryPasteOperationDuplicatesTasks(operation: GalleryPasteOperation): boolean {
  return galleryPasteOperationDescriptor(operation).duplicatesTasks;
}

export function galleryPasteOperationPreservesSource(operation: GalleryPasteOperation): boolean {
  return galleryPasteOperationDescriptor(operation).preservesSource;
}
