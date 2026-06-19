import type { BatchComposerDraft, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';

export interface WorkspaceCommands {
  setTab: (tab: 'images' | 'info' | 'settings') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export interface ComposerCommands {
  setMode: (mode: WorkMode) => void;
  setModel: (modelId: string) => void;
  setPrompt: (prompt: string) => void;
  patchParams: (params: ImageParams) => void;
  submit: () => Promise<void>;
  openParameters: () => void;
  openBatchComposer: () => void;
  setTargetImage: (file: File | null) => void;
  setReferenceImages: (files: File[]) => void;
  setMask: (file: File | null) => void;
}

export interface GalleryCommands {
  clearResults: () => void;
  deleteTask: (taskId: string) => void;
  openTaskDetail: (task: GenerationTask, image?: GeneratedImage) => void;
}

export interface BatchComposerCommands {
  setIntervalSeconds: (seconds: number) => void;
  patchDraft: (id: string, patch: Partial<BatchComposerDraft>) => void;
  patchDraftParams: (id: string, params: ImageParams) => void;
  addDraft: () => void;
  duplicateDraft: (id: string) => void;
  removeDraft: (id: string) => void;
  openParameters: (draftId: string) => void;
  submit: () => Promise<void>;
  close: () => void;
}

export interface SettingsCommands {
  save: (settings: StudioSettings) => void;
  selectModel: (modelId: string) => void;
  probeProvider: (provider: GenerationProvider, model: GenerationModel | null) => Promise<void>;
  quickCheckProvider: (provider: GenerationProvider, model: GenerationModel | null) => Promise<void>;
  clearProbeCache: (provider: GenerationProvider, model: GenerationModel | null) => void;
}

export interface DetailCommands {
  backToGallery: () => void;
  selectImage: (image: GeneratedImage) => void;
  restoreRequest: (snapshot: GenerationRequestSnapshot) => void;
}

export interface ParameterModalCommands {
  closeSingle: () => void;
  changeSingle: (params: ImageParams) => void;
  closeBatch: () => void;
  changeBatch: (params: ImageParams) => void;
}

export interface AppCommands {
  workspace: WorkspaceCommands;
  composer: ComposerCommands;
  gallery: GalleryCommands;
  batchComposer: BatchComposerCommands;
  settings: SettingsCommands;
  detail: DetailCommands;
  parameters: ParameterModalCommands;
}
