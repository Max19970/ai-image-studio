import { useEffect, useRef, useState } from 'react';
import { normalizeSelectedModel } from '../../../domain/generationSnapshots';
import type { ImageParams } from '../../../domain/imageParams';
import type { StudioSettings } from '../../../domain/studioSettings';
import {
  loadImageParams,
  loadImageParamsFromDatabase,
  loadStudioSettings,
  loadStudioSettingsFromDatabase,
  saveImageParams,
  saveStudioSettings
} from '../../../processes/storage-sync';
import type { StateSetter } from '../types';

export interface PersistentWorkspaceSettingsState {
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
}

export function usePersistentWorkspaceSettings(): PersistentWorkspaceSettingsState {
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => normalizeSelectedModel(loadStudioSettings()));
  const [params, setParams] = useState<ImageParams>(() => loadImageParams());
  const settingsHydratedRef = useRef(false);
  const paramsHydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadStudioSettingsFromDatabase().then((loaded) => {
      if (cancelled) return;
      settingsHydratedRef.current = true;
      setStudioSettings(normalizeSelectedModel(loaded));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadImageParamsFromDatabase().then((loaded) => {
      if (cancelled) return;
      paramsHydratedRef.current = true;
      setParams(loaded);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (settingsHydratedRef.current) saveStudioSettings(studioSettings);
  }, [studioSettings]);

  useEffect(() => {
    document.documentElement.dataset.studioTheme = studioSettings.interfaceTheme;
  }, [studioSettings.interfaceTheme]);

  useEffect(() => {
    if (paramsHydratedRef.current) saveImageParams(params);
  }, [params]);

  return {
    studioSettings,
    setStudioSettings,
    params,
    setParams
  };
}
