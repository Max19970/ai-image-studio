import type { Dispatch, KeyboardEventHandler, RefObject, SetStateAction } from 'react';
import type { AttachmentPreviewItem } from '../../shared/image';
import type { ProviderModelOption } from '../../entities/provider/modelOptions';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../domain/providerMode';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderControlSurfaceDefinition } from '../../entities/provider/types';
import type { RequestPreset } from '../../entities/request-presets';
import type { RequestPresetCommands } from '../../interface/context/commands';

export type ComposerPopoverId = string | null;

export interface ComposerActionContext {
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  attachmentsCount: number;
  hasMask: boolean;
  params: ImageParams;
  provider: ProviderSettings;
  studioSettings: StudioSettings;
  controlSurface: ProviderControlSurfaceDefinition;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModel: GenerationModel | null;
  modelOptions: ComposerModelOption[];
  requestPresets: RequestPreset[];
  openPopover: ComposerPopoverId;
  setOpenPopover: Dispatch<SetStateAction<ComposerPopoverId>>;
  fileInputs: {
    attachments: RefObject<HTMLInputElement | null>;
    mask: RefObject<HTMLInputElement | null>;
  };
  actions: {
    setProviderMode: (providerModeId: ProviderGenerationModeId) => void;
    changeModel: (modelId: string) => void;
    changeParams: (params: ImageParams) => void;
    openBatchComposer: () => void;
    addCurrentToBatchComposer: () => void;
    openParameters: () => void;
    clearAttachments: () => void;
    setMask: (file: File | null) => void;
    clearMask: () => void;
    openAttachmentPicker: () => void;
    openMaskPicker: () => void;
  };
  requestPresetActions: RequestPresetCommands;
}

export type ComposerModelOption = ProviderModelOption;

export interface ComposerLayoutContext {
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  prompt: string;
  busy: boolean;
  canSubmit: boolean;
  hasImageAttachments: boolean;
  attachments: AttachmentPreviewItem[];
  params: ImageParams;
  provider: ProviderSettings;
  studioSettings: StudioSettings;
  controlSurface: ProviderControlSurfaceDefinition;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModel: GenerationModel | null;
  modelOptions: ComposerModelOption[];
  statusText?: string | null;
  blockedReason?: string | null;
  expanded: boolean;
  attachmentsCount: number;
  actionContext: ComposerActionContext;
  actions: {
    changePrompt: (prompt: string) => void;
    changeModel: (modelId: string) => void;
    changeParams: (params: ImageParams) => void;
    setExpanded: (expanded: boolean) => void;
    toggleExpanded: () => void;
    submit: () => void;
    handlePromptKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
    removeAttachment: (item: AttachmentPreviewItem) => void;
    addAttachments: (files: File[]) => void;
  };
}
