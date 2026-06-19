import type { Dispatch, KeyboardEventHandler, RefObject, SetStateAction } from 'react';
import type { AttachmentPreviewItem } from '../../shared/image';
import type { ProviderModelOption } from '../../entities/provider/modelOptions';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderControlSurfaceDefinition } from '../../entities/provider/types';

export type ComposerPopoverId = string | null;

export interface ComposerActionContext {
  mode: WorkMode;
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
  openPopover: ComposerPopoverId;
  setOpenPopover: Dispatch<SetStateAction<ComposerPopoverId>>;
  fileInputs: {
    attachments: RefObject<HTMLInputElement | null>;
    mask: RefObject<HTMLInputElement | null>;
  };
  actions: {
    setMode: (mode: WorkMode) => void;
    changeModel: (modelId: string) => void;
    changeParams: (params: ImageParams) => void;
    openBatchComposer: () => void;
    openParameters: () => void;
    clearAttachments: () => void;
    setMask: (file: File | null) => void;
    clearMask: () => void;
    openAttachmentPicker: () => void;
    openMaskPicker: () => void;
  };
}

export type ComposerModelOption = ProviderModelOption;

export interface ComposerLayoutContext {
  mode: WorkMode;
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
