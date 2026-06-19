import { useState } from 'react';
import type { WorkMode } from '../../../domain/workMode';
import type { StateSetter } from '../types';

export interface ComposerWorkspaceState {
  mode: WorkMode;
  setMode: StateSetter<WorkMode>;
  compatibilityNotice: string | null;
  setCompatibilityNotice: StateSetter<string | null>;
  targetImage: File | null;
  setTargetImage: StateSetter<File | null>;
  referenceImages: File[];
  setReferenceImages: StateSetter<File[]>;
  mask: File | null;
  setMask: StateSetter<File | null>;
}

export function useComposerWorkspaceState(): ComposerWorkspaceState {
  const [mode, setMode] = useState<WorkMode>('generate');
  const [compatibilityNotice, setCompatibilityNotice] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [mask, setMask] = useState<File | null>(null);

  return {
    mode,
    setMode,
    compatibilityNotice,
    setCompatibilityNotice,
    targetImage,
    setTargetImage,
    referenceImages,
    setReferenceImages,
    mask,
    setMask
  };
}
