import { normalizeMaxStoredGenerationTasks } from '../../../src/domain/generationHistorySettings';
import { appDocumentBuckets, loadAppDocument } from '../../storage/appDocumentStore';

export interface RuntimeTaskRetentionPolicyPort {
  getCompletedTaskLimit(): number | Promise<number>;
}

export const defaultRuntimeTaskRetentionPolicy: RuntimeTaskRetentionPolicyPort = {
  getCompletedTaskLimit() {
    const descriptor = appDocumentBuckets.studioSettings;
    const { value } = loadAppDocument<Record<string, unknown> | null>(
      descriptor.bucket,
      descriptor.documentKey,
      descriptor.fallback
    );
    return normalizeMaxStoredGenerationTasks(value?.maxStoredGenerationTasks);
  }
};
