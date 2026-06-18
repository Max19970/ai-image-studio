import type { DatabaseSync } from 'node:sqlite';
import { createEncryptedBlobsTableSql } from '../schema';

export const encryptedBlobsMigration = {
  id: '001_encrypted_blobs',
  up(db: DatabaseSync) {
    db.exec(createEncryptedBlobsTableSql);
  }
};
