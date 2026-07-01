import type { SyncDocumentDescriptor } from './documentSyncEngine';
import { storageSyncDescriptorFallbackModules } from './registry.generated';

type StorageSyncDescriptorModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, StorageSyncDescriptorModule>;
};

const discoveredStorageSyncModules = (import.meta as ImportMetaWithGlob).glob?.('./*.ts', { eager: true }) ?? {};
const storageSyncModules = {
  ...storageSyncDescriptorFallbackModules,
  ...discoveredStorageSyncModules
} as Record<string, StorageSyncDescriptorModule>;

function isStorageSyncDescriptor(value: unknown): value is SyncDocumentDescriptor<unknown, unknown> {
  const candidate = value as Partial<SyncDocumentDescriptor<unknown, unknown>> | null;
  return Boolean(
    candidate?.id &&
    typeof candidate.loadFallback === 'function' &&
    typeof candidate.saveFallback === 'function' &&
    typeof candidate.loadRemote === 'function' &&
    typeof candidate.saveRemote === 'function' &&
    typeof candidate.normalize === 'function' &&
    candidate.messages
  );
}

export const storageSyncDocumentDescriptors: readonly SyncDocumentDescriptor<unknown, unknown>[] = Array.from(
  Object.entries(storageSyncModules)
    .flatMap(([sourcePath, module]) => Object.values(module).filter(isStorageSyncDescriptor).map((descriptor) => ({ descriptor, sourcePath })))
    .reduce((byId, item) => byId.set(item.descriptor.id, item), new Map<string, { descriptor: SyncDocumentDescriptor<unknown, unknown>; sourcePath: string }>())
    .values()
)
  .sort((a, b) => a.descriptor.id.localeCompare(b.descriptor.id) || a.sourcePath.localeCompare(b.sourcePath))
  .map(({ descriptor }) => descriptor);

export const storageSyncDocumentDescriptorsById = new Map(
  storageSyncDocumentDescriptors.map((descriptor) => [descriptor.id, descriptor] as const)
);
