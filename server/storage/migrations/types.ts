import type { DatabaseSync } from 'node:sqlite';

export interface StorageMigrationDescriptor {
  id: string;
  up(db: DatabaseSync): void;
}
