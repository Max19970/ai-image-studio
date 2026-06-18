import type { Dispatch, KeyboardEventHandler, RefObject, SetStateAction } from 'react';
import type { AttachmentPreviewItem } from '../../shared/image/attachmentPreviewTypes';
import type { GenerationModel } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';

export type ComposerPopoverId = string | null;

export interface ComposerActionContext {
  mode: WorkMode;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  attachments: AttachmentPreviewItem[];
  openPopover: ComposerPopoverId;
  setOpenPopover: Dispatch<SetStateAction<ComposerPopoverId>>;
  fileInputs: {
    target: RefObject<HTMLInputElement | null>;
    references: RefObject<HTMLInputElement | null>;
    mask: RefObject<HTMLInputElement | null>;
  };
  actions: {
    setMode: (mode: WorkMode) => void;
    openBatchComposer: () => void;
    openParameters: () => void;
    clearAttachments: () => void;
    openTargetPicker: () => void;
    openReferencePicker: () => void;
    openMaskPicker: () => void;
  };
}


export interface ComposerModelOption {
  value: string;
  label: string;
  description: string;
}

export interface ComposerLayoutContext {
  mode: WorkMode;
  prompt: string;
  busy: boolean;
  canSubmit: boolean;
  targetImage: File | null;
  attachments: AttachmentPreviewItem[];
  selectedModel: GenerationModel | null;
  modelOptions: ComposerModelOption[];
  statusText?: string | null;
  actionContext: ComposerActionContext;
  actions: {
    changePrompt: (prompt: string) => void;
    changeModel: (modelId: string) => void;
    submit: () => void;
    handlePromptKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
    removeAttachment: (item: AttachmentPreviewItem) => void;
    addReferences: (files: File[]) => void;
    setTargetImage: (file: File | null) => void;
    setMask: (file: File | null) => void;
  };
}
