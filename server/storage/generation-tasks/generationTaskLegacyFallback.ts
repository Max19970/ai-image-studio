import { historyBlobKey, loadEncryptedBlob, saveEncryptedBlob } from '../encryptedStore';
import type { GenerationTaskHistoryLoadOptions } from './types';

export function loadLegacyGenerationTaskHistory(options: Required<GenerationTaskHistoryLoadOptions>): unknown[] {
  const legacy = loadEncryptedBlob<unknown[]>(historyBlobKey, []);
  if (!Array.isArray(legacy)) return [];
  return legacy.slice(options.offset, options.offset + options.limit);
}

export function clearLegacyGenerationTaskHistory() {
  // Keep the v1 blob empty so legacy fallback does not resurrect cleared v2 history.
  saveEncryptedBlob(historyBlobKey, []);
}
