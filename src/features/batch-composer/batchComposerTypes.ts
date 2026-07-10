import type { RefObject } from 'react';
import type { AttachmentPreviewItem } from '../../shared/image';
import type { BatchComposerDraft } from '../../domain/generationTask';
import type { RequestPreset } from '../../entities/request-presets';
import type { RequestPresetCommands } from '../../interface/context/commands';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderModelOption } from '../../entities/provider/modelOptions';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderControlSurfaceDefinition } from '../../entities/provider/types';

export interface BatchComposerLayoutContext {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  studioSettings: StudioSettings;
  totalImages: number;
  validDrafts: number;
  blockedReason?: string | null;
  selectedDraftId: string | null;
  selectedDraftIndex: number;
  requestPresets: RequestPreset[];
  actions: {
    changeIntervalSeconds: (value: number) => void;
    changeDraft: (id: string, patch: Partial<BatchComposerDraft>) => void;
    changeDraftParams: (id: string, params: ImageParams) => void;
    selectDraft: (id: string) => void;
    addDraft: () => void;
    duplicateDraft: (id: string) => void;
    removeDraft: (id: string) => void;
    openParameters: (id: string) => void;
    submit: () => void;
    cancel: () => void;
    requestPresets: RequestPresetCommands;
  };
}

export interface BatchDraftLayoutContext {
  draft: BatchComposerDraft;
  index: number;
  canRemove: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  provider: ProviderSettings;
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  studioSettings: StudioSettings;
  controlSurface: ProviderControlSurfaceDefinition;
  selectedModel: GenerationModel | null;
  modelOptions: ProviderModelOption[];
  attachments: AttachmentPreviewItem[];
  attachmentsCount: number;
  requestPresets: RequestPreset[];
  fileInputs: {
    attachments: RefObject<HTMLInputElement | null>;
    mask: RefObject<HTMLInputElement | null>;
  };
  actions: {
    patchDraft: (patch: Partial<BatchComposerDraft>) => void;
    patchParams: (patch: Partial<ImageParams>) => void;
    duplicateDraft: () => void;
    removeDraft: () => void;
    openParameters: () => void;
    addAttachments: (files: File[]) => void;
    removeAttachment: (item: AttachmentPreviewItem) => void;
    clearAttachments: () => void;
    savePreset: (name?: string, note?: string) => void;
    updatePreset: (presetId: string, patch: { name?: string; note?: string; captureCurrent?: boolean }) => void;
    deletePreset: (presetId: string) => void;
    applyPreset: (presetId: string) => void;
  };
}
