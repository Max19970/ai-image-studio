import type { AppCommands } from '../../interface/context/commands';
import type { WorkspaceComposerDockContext, WorkspaceModalsContext } from '../../interface/context/workspace/composerDock';
import type { WorkspaceMainContext } from '../../interface/context/workspace/main';
import type { WorkspaceSidebarContext } from '../../interface/context/workspace/sidebar';
import type { WorkspaceTab } from '../../interface/context/workspace/tabs';
import type { BatchComposerDraft, GeneratedImage, GenerationTask } from '../../domain/generationTask';
import type { GalleryFolder } from '../../domain/galleryFilesystem';
import type { RequestPreset } from '../../entities/request-presets';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation } from '../../entities/gallery/galleryClipboard';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../entities/gallery/galleryMetadata';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../domain/providerProbe';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type { TaskHistoryCommands } from '../commands/types';
import type { ServerSubmissionState, StateSetter } from '../stateTypes';

export type { ServerSubmissionState, StateSetter } from '../stateTypes';

export interface WorkspaceState {
  providerModeId: ProviderGenerationModeId;
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
  compatibilityNotice: string | null;
  setCompatibilityNotice: StateSetter<string | null>;
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
  parametersOpen: boolean;
  setParametersOpen: StateSetter<boolean>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: StateSetter<boolean>;
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: StateSetter<WorkspaceTab>;
  activeGalleryPath: string;
  setActiveGalleryPath: StateSetter<string>;
  galleryFolders: GalleryFolder[];
  setGalleryFolders: StateSetter<GalleryFolder[]>;
  galleryPins: GalleryPinItem[];
  setGalleryPins: StateSetter<GalleryPinItem[]>;
  galleryTagRecords: GalleryTagRecord[];
  setGalleryTagRecords: StateSetter<GalleryTagRecord[]>;
  refreshGalleryFolders: () => Promise<void>;
  refreshGalleryMetadata: () => Promise<void>;
  createGalleryFolder: (name: string) => Promise<void>;
  deleteGalleryFolder: (path: string) => Promise<void>;
  moveGalleryItem: (itemKind: 'task' | 'folder', itemId: string, targetPath: string) => Promise<void>;
  pasteGalleryItems: (operation: GalleryClipboardOperation, items: GalleryClipboardItemPayload[], targetPath: string) => Promise<void>;
  setGalleryItemPinned: (kind: GalleryMetadataKind, id: string, enabled: boolean) => Promise<void>;
  setGalleryItemTags: (kind: GalleryMetadataKind, id: string, tags: string[]) => Promise<void>;
  targetImage: File | null;
  setTargetImage: StateSetter<File | null>;
  referenceImages: File[];
  setReferenceImages: StateSetter<File[]>;
  mask: File | null;
  setMask: StateSetter<File | null>;
  tasks: GenerationTask[];
  taskHistory: TaskHistoryCommands;
  selectedTaskId: string | null;
  setSelectedTaskId: StateSetter<string | null>;
  selectedImageId: string | null;
  setSelectedImageId: StateSetter<string | null>;
  busy: boolean;
  setBusy: StateSetter<boolean>;
  serverSubmission: ServerSubmissionState;
  setServerSubmission: StateSetter<ServerSubmissionState>;
  probeError: string | null;
  setProbeError: StateSetter<string | null>;
  probingProviderId: string | null;
  setProbingProviderId: StateSetter<string | null>;
  quickCheckingProviderId: string | null;
  setQuickCheckingProviderId: StateSetter<string | null>;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  setQuickCheckResults: StateSetter<Record<string, ProviderQuickCheckResult>>;
  capabilityReport: ProviderProbeReport | null;
  setCapabilityReport: StateSetter<ProviderProbeReport | null>;
  requestPresets: RequestPreset[];
  setRequestPresets: StateSetter<RequestPreset[]>;
  batchComposerOpen: boolean;
  setBatchComposerOpen: StateSetter<boolean>;
  batchDrafts: BatchComposerDraft[];
  setBatchDrafts: StateSetter<BatchComposerDraft[]>;
  batchIntervalSeconds: number;
  setBatchIntervalSeconds: StateSetter<number>;
  batchParametersDraftId: string | null;
  setBatchParametersDraftId: StateSetter<string | null>;
}

export interface WorkspaceDerivedState {
  activeModel: GenerationModel | null;
  activeProvider: GenerationProvider | null;
  provider: ProviderSettings;
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  mode: WorkMode;
  payload: Record<string, unknown>;
  rawJsonError: string | null;
  warnings: string[];
  canSubmit: boolean;
  selectedTask: GenerationTask | null;
  selectedImage: GeneratedImage | null;
  currentTask: GenerationTask | null;
  activeBatchDraft: BatchComposerDraft | null;
  batchCanSubmit: boolean;
  batchWarnings: string[];
  statusText: string | null;
}

export interface WorkspaceContexts {
  sidebar: WorkspaceSidebarContext;
  main: WorkspaceMainContext;
  dock: WorkspaceComposerDockContext;
  modals: WorkspaceModalsContext;
}

export interface WorkspaceViewModel {
  state: WorkspaceState;
  derived: WorkspaceDerivedState;
  commands: AppCommands;
  contexts: WorkspaceContexts;
}
