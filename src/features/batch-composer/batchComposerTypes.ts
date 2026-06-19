import type { RefObject } from 'react';
import type { AttachmentPreviewItem } from '../../shared/image';
import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderModelOption } from '../../entities/provider/modelOptions';

export interface BatchComposerLayoutContext {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  totalImages: number;
  validDrafts: number;
  selectedDraftId: string | null;
  selectedDraftIndex: number;
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
  };
}

export interface BatchDraftLayoutContext {
  draft: BatchComposerDraft;
  index: number;
  canRemove: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModel: GenerationModel | null;
  modelOptions: ProviderModelOption[];
  attachments: AttachmentPreviewItem[];
  attachmentsCount: number;
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
  };
}
