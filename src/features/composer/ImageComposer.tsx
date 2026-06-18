import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import type { AttachmentPreviewItem } from '../../shared/image/attachmentPreviewTypes';
import type { ComposerActionContext, ComposerLayoutContext, ComposerModelOption, ComposerPopoverId } from './composerTypes';
import { getReferenceAttachmentId, useAttachmentPreviewItems } from '../../shared/image/useAttachmentPreviewItems';
import styles from './ComposerLayout.module.css';

interface Props {
  mode: WorkMode;
  prompt: string;
  busy: boolean;
  canSubmit: boolean;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModelId: string;
  statusText?: string | null;
  commands: ComposerCommands;
}

export function ImageComposer({
  mode,
  prompt,
  busy,
  canSubmit,
  targetImage,
  referenceImages,
  mask,
  models,
  providers,
  selectedModelId,
  statusText,
  commands
}: Props) {
  const { t } = useI18n();
  const [openPopover, setOpenPopover] = useState<ComposerPopoverId>(null);
  const targetRef = useRef<HTMLInputElement | null>(null);
  const refsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;

  const attachmentLabels = useMemo(() => ({
    target: t('composer.role.target'),
    reference: (index: number) => t('composer.role.ref', { index }),
    mask: t('composer.role.mask')
  }), [t]);

  const attachments = useAttachmentPreviewItems({ targetImage, referenceImages, mask, labels: attachmentLabels });

  const modelOptions = useMemo<ComposerModelOption[]>(() => models.map((model) => {
    const provider = providers.find((item) => item.id === model.providerId);
    return {
      value: model.id,
      label: model.name || model.modelId,
      description: [model.modelId, provider?.name].filter(Boolean).join(' · ')
    };
  }), [models, providers]);

  const removeAttachment = useCallback((item: AttachmentPreviewItem) => {
    if (item.role === 'target') commands.setTargetImage(null);
    if (item.role === 'mask') commands.setMask(null);
    if (item.role === 'reference') {
      commands.setReferenceImages(referenceImages.filter((file, index) => item.id !== getReferenceAttachmentId(file, index)));
    }
  }, [commands.setMask, commands.setReferenceImages, commands.setTargetImage, referenceImages]);

  const clearAttachments = useCallback(() => {
    commands.setTargetImage(null);
    commands.setReferenceImages([]);
    commands.setMask(null);
    setOpenPopover(null);
  }, [commands.setMask, commands.setReferenceImages, commands.setTargetImage]);

  const addReferences = useCallback((files: File[]) => {
    const merged = [...referenceImages, ...files].slice(0, 15);
    commands.setReferenceImages(merged);
  }, [commands.setReferenceImages, referenceImages]);

  const submitOnEnter = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      commands.submit();
    }
  }, [commands.submit]);

  const composerActionContext = useMemo<ComposerActionContext>(() => ({
    mode,
    targetImage,
    referenceImages,
    mask,
    attachments,
    openPopover,
    setOpenPopover,
    fileInputs: {
      target: targetRef,
      references: refsRef,
      mask: maskRef
    },
    actions: {
      setMode: commands.setMode,
      openBatchComposer: commands.openBatchComposer,
      openParameters: commands.openParameters,
      clearAttachments,
      openTargetPicker: () => targetRef.current?.click(),
      openReferencePicker: () => refsRef.current?.click(),
      openMaskPicker: () => maskRef.current?.click()
    }
  }), [mode, targetImage, referenceImages, mask, attachments, openPopover, commands.setMode, commands.openBatchComposer, commands.openParameters, clearAttachments]);

  const composerLayoutContext = useMemo<ComposerLayoutContext>(() => ({
    mode,
    prompt,
    busy,
    canSubmit,
    targetImage,
    attachments,
    selectedModel,
    modelOptions,
    statusText,
    actionContext: composerActionContext,
    actions: {
      changePrompt: commands.setPrompt,
      changeModel: commands.setModel,
      submit: commands.submit,
      handlePromptKeyDown: submitOnEnter,
      removeAttachment,
      addReferences,
      setTargetImage: commands.setTargetImage,
      setMask: commands.setMask
    }
  }), [
    mode,
    prompt,
    busy,
    canSubmit,
    targetImage,
    attachments,
    selectedModel,
    modelOptions,
    statusText,
    composerActionContext,
    commands.setPrompt,
    commands.setModel,
    commands.submit,
    submitOnEnter,
    removeAttachment,
    addReferences,
    commands.setTargetImage,
    commands.setMask
  ]);

  return (
    <section className={styles.dock} aria-label={t('composer.aria')}>
      <SlotHost<ComposerLayoutContext> slot="composer/attachments" context={composerLayoutContext} as={null} />

      <div className={styles.main}>
        <SlotHost<ComposerLayoutContext> slot="composer/input" context={composerLayoutContext} as={null} />
        <SlotHost<ComposerLayoutContext> slot="composer/actions" context={composerLayoutContext} as={null} />
      </div>

      <SlotHost<ComposerLayoutContext> slot="composer/status" context={composerLayoutContext} as={null} />
    </section>
  );
}
