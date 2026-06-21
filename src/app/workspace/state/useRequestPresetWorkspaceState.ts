import { useEffect, useRef, useState } from 'react';
import type { RequestPreset } from '../../../entities/request-presets';
import {
  loadRequestPresets,
  loadRequestPresetsFromDatabase,
  saveRequestPresets
} from '../../../processes/storage-sync';
import type { StateSetter } from '../types';

export interface RequestPresetWorkspaceState {
  requestPresets: RequestPreset[];
  setRequestPresets: StateSetter<RequestPreset[]>;
}

export function useRequestPresetWorkspaceState(): RequestPresetWorkspaceState {
  const [requestPresets, setRequestPresets] = useState<RequestPreset[]>(() => loadRequestPresets());
  const presetsHydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadRequestPresetsFromDatabase().then((loaded) => {
      if (cancelled) return;
      presetsHydratedRef.current = true;
      setRequestPresets(loaded);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (presetsHydratedRef.current) saveRequestPresets(requestPresets);
  }, [requestPresets]);

  return {
    requestPresets,
    setRequestPresets
  };
}
