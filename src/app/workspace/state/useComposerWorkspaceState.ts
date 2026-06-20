import { useState } from 'react';
import type { ProviderGenerationModeId } from '../../../domain/providerMode';
import { openAiCompatibleImageGenerateModeId } from '../../../entities/generation-params/openai-compatible/modes';
import type { StateSetter } from '../types';

export interface ComposerWorkspaceState {
  providerModeId: ProviderGenerationModeId;
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
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
  const [providerModeId, setProviderModeId] = useState<ProviderGenerationModeId>(openAiCompatibleImageGenerateModeId);
  const [compatibilityNotice, setCompatibilityNotice] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [mask, setMask] = useState<File | null>(null);

  return {
    providerModeId,
    setProviderModeId,
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
