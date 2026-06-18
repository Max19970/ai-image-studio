import { generationTaskAssetBucket, loadEncryptedDocument, saveEncryptedDocument } from '../encryptedStore';
import type { JsonObject, StoredImageReference } from './types';

export function loadGenerationTaskAssetDocument(key: string): JsonObject | null {
  return loadEncryptedDocument<JsonObject | null>(generationTaskAssetBucket, key, null);
}

export function saveGenerationTaskAssetDocuments(refs: StoredImageReference[]) {
  return refs.reduce((totals, ref) => {
    const stats = saveEncryptedDocument(generationTaskAssetBucket, ref.documentKey, ref.document);
    totals.compressedBytes += stats.compressedBytes;
    totals.encryptedBytes += stats.encryptedBytes;
    totals.assetCount += 1;
    if (ref.assetKind === 'thumbnail') totals.thumbnailCount += 1;
    return totals;
  }, { compressedBytes: 0, encryptedBytes: 0, assetCount: 0, thumbnailCount: 0 });
}
