import type { RequestPreset } from '../../../entities/request-presets';
import { requestPresetsSyncDescriptor } from '../../../processes/storage-sync/requestPresets';
import type { StateSetter } from '../types';
import { useSyncedDocumentState } from './useSyncedDocumentState';

export interface RequestPresetWorkspaceState {
  requestPresets: RequestPreset[];
  setRequestPresets: StateSetter<RequestPreset[]>;
}

export function useRequestPresetWorkspaceState(): RequestPresetWorkspaceState {
  const synced = useSyncedDocumentState(requestPresetsSyncDescriptor, undefined);
  return {
    requestPresets: synced.value,
    setRequestPresets: synced.setValue
  };
}
