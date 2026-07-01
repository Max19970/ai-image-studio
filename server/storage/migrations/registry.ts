import { storageMigrationGeneratedModules } from './registry.generated';
import type { StorageMigrationDescriptor } from './types';

type StorageMigrationModule = Record<string, unknown>;

function isStorageMigrationDescriptor(value: unknown): value is StorageMigrationDescriptor {
  const candidate = value as Partial<StorageMigrationDescriptor> | null;
  return Boolean(candidate?.id && typeof candidate.up === 'function');
}

function collectStorageMigrations(modules: Record<string, StorageMigrationModule>): StorageMigrationDescriptor[] {
  return Object.entries(modules)
    .flatMap(([sourcePath, module]) =>
      Object.values(module)
        .filter(isStorageMigrationDescriptor)
        .map((migration) => ({ migration, sourcePath }))
    )
    .sort((a, b) => a.migration.id.localeCompare(b.migration.id) || a.sourcePath.localeCompare(b.sourcePath))
    .map(({ migration }) => migration);
}

export function listStorageMigrations(): StorageMigrationDescriptor[] {
  return collectStorageMigrations(storageMigrationGeneratedModules);
}
