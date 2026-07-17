import type { GalleryFolder } from '../../domain/galleryFilesystem';
import type { RequestPreset } from '../../entities/request-presets';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation } from '../../entities/gallery/galleryClipboard';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../entities/gallery/galleryMetadata';
import type { BatchComposerDraft, ComposerRequestDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ServerSubmissionSetter, StateSetter, TaskHistoryCommands, TranslateFn, WorkspaceNavigationCommands } from './types';

export interface ProviderProbeCommandDeps {
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  clearCapabilityReport(settings: ProviderSettings): void;
  setProbeError: StateSetter<string | null>;
  setProbingProviderId: StateSetter<string | null>;
  setQuickCheckingProviderId: StateSetter<string | null>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
}

export type ProviderProbeCommandState = ProviderProbeCommandDeps;

export interface ComposerCompatibilityCommandDeps {
  t: TranslateFn;
  params: ImageParams;
  providerModeId: ProviderGenerationModeId;
  studioSettings: StudioSettings;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  replaceActiveComposerRequest: (
    request: Omit<ComposerRequestDraft, 'id'>,
    notice: string | null
  ) => void;
  setCompatibilityNotice: StateSetter<string | null>;
}

export interface BatchCompatibilityCommandDeps {
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
}

export interface WorkspaceCommandDeps {
  setWorkspaceTab: StateSetter<'images' | 'info' | 'settings'>;
  setSidebarCollapsed: StateSetter<boolean>;
}

export interface ComposerCommandDeps extends ComposerCompatibilityCommandDeps {
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  canSubmit: boolean;
  activeGalleryPath: string;
  composerDrafts: ComposerRequestDraft[];
  activeComposerDraftId: string;
  composerIntervalSeconds: number;
  capabilityReport: ProviderProbeReport | null;
  setComposerDrafts: StateSetter<ComposerRequestDraft[]>;
  selectComposerDraft: (id: string) => void;
  addComposerDraft: () => void;
  duplicateComposerDraft: (id: string) => void;
  removeComposerDraft: (id: string) => void;
  patchComposerDraft: (id: string, patch: Partial<ComposerRequestDraft>) => void;
  patchComposerDraftParams: (id: string, patch: Partial<ImageParams>) => void;
  setComposerIntervalSeconds: StateSetter<number>;
  setComposerParametersDraftId: StateSetter<string | null>;
  setParams: StateSetter<ImageParams>;
  setStudioSettings: StateSetter<StudioSettings>;
  taskHistory: Pick<TaskHistoryCommands, 'ingestServerTask'>;
  setBusy: StateSetter<boolean>;
  setServerSubmission: ServerSubmissionSetter;
  normalizeSettings: (settings: StudioSettings) => StudioSettings;
}

export interface BatchComposerCommandDeps {
  t: TranslateFn;
  providerModeId: ProviderGenerationModeId;
  params: ImageParams;
  studioSettings: StudioSettings;
  capabilityReport: ProviderProbeReport | null;
  activeGalleryPath: string;
  batchCanSubmit: boolean;
  batchDrafts: BatchComposerDraft[];
  batchIntervalSeconds: number;
  setBusy: StateSetter<boolean>;
  setBatchComposerOpen: StateSetter<boolean>;
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
  setBatchIntervalSeconds: StateSetter<number>;
  setBatchParametersDraftId: StateSetter<string | null>;
}

export interface GalleryHiresFixCommandDeps {
  t: TranslateFn;
  params: ImageParams;
  studioSettings: StudioSettings;
  replaceActiveComposerRequest: (
    request: Omit<ComposerRequestDraft, 'id'>,
    notice: string | null
  ) => void;
  setWorkspaceTab: StateSetter<'images' | 'info' | 'settings'>;
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
  setCompatibilityNotice: StateSetter<string | null>;
}

export interface GalleryCommandDeps {
  activeGalleryPath: string;
  galleryFolders: GalleryFolder[];
  galleryPins: GalleryPinItem[];
  galleryTagRecords: GalleryTagRecord[];
  selectedTaskId: string | null;
  taskHistory: TaskHistoryCommands;
  navigation: WorkspaceNavigationCommands;
  hiresFix: GalleryHiresFixCommandDeps;
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
  setActiveGalleryPath: StateSetter<string>;
  createGalleryFolder: (name: string) => Promise<void>;
  createGalleryFolderAt: (parentPath: string, name: string) => Promise<void>;
  renameGalleryFolder: (path: string, name: string) => Promise<void>;
  deleteGalleryFolder: (path: string) => Promise<void>;
  moveGalleryItem: (itemKind: 'task' | 'folder', itemId: string, targetPath: string) => Promise<void>;
  pasteGalleryItems: (operation: GalleryClipboardOperation, items: GalleryClipboardItemPayload[], targetPath: string) => Promise<void>;
  setGalleryItemPinned: (kind: GalleryMetadataKind, id: string, enabled: boolean) => Promise<void>;
  setGalleryItemTags: (kind: GalleryMetadataKind, id: string, tags: string[]) => Promise<void>;
}

export interface SettingsCommandDeps {
  studioSettings: StudioSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  setStudioSettings: StateSetter<StudioSettings>;
  applyStudioSettingsToComposer: (settings: StudioSettings, compatibilityNotice: string) => void;
  normalizeSettings: (settings: StudioSettings) => StudioSettings;
  composerCompatibility: ComposerCompatibilityCommandDeps;
  batchCompatibility: BatchCompatibilityCommandDeps;
  providerProbe: ProviderProbeCommandDeps;
}

export interface DetailCommandDeps {
  t: TranslateFn;
  params: ImageParams;
  studioSettings: StudioSettings;
  hiresFix: GalleryHiresFixCommandDeps;
  replaceActiveComposerRequest: (
    request: Omit<ComposerRequestDraft, 'id'>,
    notice: string | null
  ) => void;
  setSelectedTaskId: StateSetter<string | null>;
  setSelectedImageId: StateSetter<string | null>;
}

export interface ParameterCommandDeps {
  activeComposerDraft: ComposerRequestDraft | null;
  setComposerParametersDraftId: StateSetter<string | null>;
  patchComposerDraft: (id: string, patch: Partial<ComposerRequestDraft>) => void;
}

export interface RequestPresetCommandDeps {
  t: TranslateFn;
  providerModeId: ProviderGenerationModeId;
  providerMode: ProviderGenerationModeDefinition;
  params: ImageParams;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  studioSettings: StudioSettings;
  batchDrafts: BatchComposerDraft[];
  requestPresets: RequestPreset[];
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
  setCompatibilityNotice: StateSetter<string | null>;
  setParams: StateSetter<ImageParams>;
  setStudioSettings: StateSetter<StudioSettings>;
  setTargetImage: StateSetter<File | null>;
  setReferenceImages: StateSetter<File[]>;
  setMask: StateSetter<File | null>;
  replaceActiveComposerRequest: (
    request: Omit<ComposerRequestDraft, 'id'>,
    notice: string | null
  ) => void;
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
  setRequestPresets: StateSetter<RequestPreset[]>;
  normalizeSettings: (settings: StudioSettings) => StudioSettings;
}

export interface CreateAppCommandsArgs {
  workspace: WorkspaceCommandDeps;
  composer: ComposerCommandDeps;
  gallery: GalleryCommandDeps;
  settings: SettingsCommandDeps;
  detail: DetailCommandDeps;
  parameters: ParameterCommandDeps;
  requestPresets: RequestPresetCommandDeps;
}
