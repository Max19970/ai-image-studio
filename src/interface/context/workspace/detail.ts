import type { GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../../domain/generationTask';

export interface DetailLayoutContext {
  task: GenerationTask;
  activeImage: GeneratedImage | null;
  fallbackActiveImage: GeneratedImage | null;
  label: string;
  shouldUseCarousel: boolean;
  onBack: () => void;
  onSelectImage?: (image: GeneratedImage) => void;
  onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void;
  onStartHiresFix?: (task: GenerationTask, image?: GeneratedImage | null) => Promise<void>;
  setActiveImage: (image: GeneratedImage | null) => void;
}

export interface DetailActionContext {
  activeImage: GeneratedImage | null;
  snapshot: GenerationRequestSnapshot;
  isBatchSnapshot: boolean;
  onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void;
  onStartHiresFix?: (image?: GeneratedImage | null) => Promise<void>;
}
