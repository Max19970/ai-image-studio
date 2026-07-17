import { useEffect } from 'react';
import type { ImageParams } from '../../../domain/imageParams';
import type { StudioSettings } from '../../../domain/studioSettings';
import { imageParamsSyncDescriptor } from '../../../processes/storage-sync/imageParams';
import { studioSettingsSyncDescriptor } from '../../../processes/storage-sync/studioSettings';
import type { StateSetter } from '../types';
import { useSyncedDocumentState } from './useSyncedDocumentState';

export interface PersistentWorkspaceSettingsState {
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
  settingsHydration: 'loading' | 'ready' | 'degraded';
  paramsHydration: 'loading' | 'ready' | 'degraded';
}

export function usePersistentWorkspaceSettings(): PersistentWorkspaceSettingsState {
  const settings = useSyncedDocumentState(studioSettingsSyncDescriptor, undefined);
  const params = useSyncedDocumentState(imageParamsSyncDescriptor, undefined);

  useEffect(() => {
    document.documentElement.dataset.studioTheme = settings.value.interfaceTheme;
  }, [settings.value.interfaceTheme]);

  return {
    studioSettings: settings.value,
    setStudioSettings: settings.setValue,
    params: params.value,
    setParams: params.setValue,
    settingsHydration: settings.hydration,
    paramsHydration: params.hydration
  };
}
