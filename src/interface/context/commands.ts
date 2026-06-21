import type { GalleryFolder } from '../../domain/galleryFilesystem';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation } from '../../entities/gallery/galleryClipboard';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../entities/gallery/galleryMetadata';
import type { BatchComposerDraft, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { RequestPreset } from '../../entities/request-presets';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';

export interface WorkspaceCommands {
  setTab: (tab: 'images' | 'info' | 'settings') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export interface RequestPresetCommands {
  saveCurrent: (name?: string, note?: string) => void;
  saveBatchDraft: (draftId: string, name?: string, note?: string) => void;
  applyPreset: (presetId: string) => void;
  updatePreset: (presetId: string, patch: { name?: string; note?: string; captureCurrent?: boolean; captureBatchDraftId?: string }) => void;
  deletePreset: (presetId: string) => void;
  applyPresetToBatchDraft: (draftId: string, presetId: string) => void;
}

export interface ComposerCommands {
  setProviderMode: (providerModeId: ProviderGenerationModeId) => void;
  setModel: (modelId: string) => void;
  setPrompt: (prompt: string) => void;
  patchParams: (params: ImageParams) => void;
  submit: () => Promise<void>;
  openParameters: () => void;
  openBatchComposer: () => void;
  setTargetImage: (file: File | null) => void;
  setReferenceImages: (files: File[]) => void;
  setImageAttachments: (targetImage: File | null, referenceImages: File[]) => void;
  setMask: (file: File | null) => void;
  requestPresets: RequestPresetCommands;
}

export interface GalleryCommands {
  activePath: string;
  galleryFolders: GalleryFolder[];
  galleryPins: GalleryPinItem[];
  galleryTagRecords: GalleryTagRecord[];
  clearResults: () => void;
  deleteTask: (taskId: string) => void;
  openTaskDetail: (task: GenerationTask, image?: GeneratedImage) => void;
  startHiresFix: (task: GenerationTask, image?: GeneratedImage | null) => Promise<void>;
  setActivePath: (path: string) => void;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
  moveItem: (itemKind: 'task' | 'folder', itemId: string, targetPath: string) => Promise<void>;
  pasteItems: (operation: GalleryClipboardOperation, items: GalleryClipboardItemPayload[], targetPath: string) => Promise<void>;
  setPinned: (kind: GalleryMetadataKind, id: string, enabled: boolean) => Promise<void>;
  setTags: (kind: GalleryMetadataKind, id: string, tags: string[]) => Promise<void>;
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
  requestPresets: RequestPresetCommands;
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
