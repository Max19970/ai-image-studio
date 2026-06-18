import type { Dispatch, SetStateAction } from 'react';
import type { GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../../domain/generationTask';

export interface DetailLayoutContext {
  task: GenerationTask;
  activeImage: GeneratedImage | null;
  fallbackActiveImage: GeneratedImage | null;
  label: string;
  requestOpen: boolean;
  shouldUseCarousel: boolean;
  onBack: () => void;
  onSelectImage?: (image: GeneratedImage) => void;
  onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void;
  setActiveImage: Dispatch<SetStateAction<GeneratedImage | null>>;
  setRequestOpen: Dispatch<SetStateAction<boolean>>;
}

export interface DetailActionContext {
  activeImage: GeneratedImage | null;
  snapshot: GenerationRequestSnapshot;
  isBatchSnapshot: boolean;
  onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void;
}
