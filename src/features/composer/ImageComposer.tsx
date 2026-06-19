import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import { useEventCallback } from '../../shared/hooks/useEventCallback';
import type { AttachmentPreviewItem } from '../../shared/image';
import type { ComposerActionContext, ComposerLayoutContext, ComposerModelOption, ComposerPopoverId } from './composerTypes';
import { getReferenceAttachmentId, useFlatAttachmentPreviewItems } from '../../shared/image';
import { getProviderModelOptions, getSelectedModel } from '../../entities/provider/modelOptions';
import styles from './ComposerLayout.module.css';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

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
  const [expanded, setExpanded] = useState(false);
  const attachmentsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const selectedModel = useMemo(() => getSelectedModel(models, selectedModelId), [models, selectedModelId]);
  const setMode = useEventCallback(commands.setMode);
  const setModel = useEventCallback(commands.setModel);
  const setPrompt = useEventCallback(commands.setPrompt);
  const submit = useEventCallback(commands.submit);
  const openParameters = useEventCallback(commands.openParameters);
  const openBatchComposer = useEventCallback(commands.openBatchComposer);
  const setTargetImage = useEventCallback(commands.setTargetImage);
  const setReferenceImages = useEventCallback(commands.setReferenceImages);
  const setMask = useEventCallback(commands.setMask);

  const flatImages = useMemo(() => [
    ...(targetImage ? [{ id: 'target', file: targetImage, role: 'image' as const }] : []),
    ...referenceImages.map((file, index) => ({ id: getReferenceAttachmentId(file, index), file, role: 'image' as const })),
    ...(mask ? [{ id: 'mask', file: mask, role: 'mask' as const, label: t('composer.mask') }] : [])
  ], [targetImage, referenceImages, mask, t]);

  const getAttachmentLabel = useCallback((index: number) => t('composer.imageAttachmentLabel', { index }), [t]);

  const attachments = useFlatAttachmentPreviewItems({
    images: flatImages,
    label: getAttachmentLabel
  });
  const hasImageAttachments = attachments.length > 0;
  const hasStatusContent = Boolean(statusText) || (mode === 'edit' && !hasImageAttachments);
  const revealSecondary = expanded || hasStatusContent;

  const modelOptions = useMemo<ComposerModelOption[]>(() => getProviderModelOptions(models, providers), [models, providers]);

  const removeAttachment = useCallback((item: AttachmentPreviewItem) => {
    if (item.id === 'target') {
      setTargetImage(null);
      return;
    }
    if (item.id === 'mask') {
      setMask(null);
      return;
    }
    setReferenceImages(referenceImages.filter((file, index) => item.id !== getReferenceAttachmentId(file, index)));
  }, [setMask, setReferenceImages, setTargetImage, referenceImages]);

  const clearAttachments = useCallback(() => {
    setTargetImage(null);
    setReferenceImages([]);
    setMask(null);
    setOpenPopover(null);
  }, [setMask, setReferenceImages, setTargetImage]);

  const setMaskAttachment = useCallback((file: File | null) => {
    setMask(file);
    if (file) setMode('edit');
  }, [setMask, setMode]);

  const clearMask = useCallback(() => {
    setMask(null);
  }, [setMask]);

  const addAttachments = useCallback((files: File[]) => {
    const merged = [...referenceImages, ...files].slice(0, 16);
    setTargetImage(null);
    setReferenceImages(merged);
    if (merged.length > 0) setMode('edit');
  }, [setMode, setReferenceImages, setTargetImage, referenceImages]);

  const toggleExpanded = useCallback(() => {
    setExpanded((value) => !value);
  }, []);

  const submitOnEnter = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      commands.submit();
    }
  }, [commands.submit]);

  const composerActionContext = useMemo<ComposerActionContext>(() => ({
    mode,
    attachmentsCount: attachments.length,
    hasMask: Boolean(mask),
    selectedModel,
    modelOptions,
    openPopover,
    setOpenPopover,
    fileInputs: {
      attachments: attachmentsRef,
      mask: maskRef
    },
    actions: {
      setMode,
      changeModel: setModel,
      openBatchComposer,
      openParameters,
      clearAttachments,
      setMask: setMaskAttachment,
      clearMask,
      openAttachmentPicker: () => attachmentsRef.current?.click(),
      openMaskPicker: () => maskRef.current?.click()
    }
  }), [
    mode,
    attachments.length,
    mask,
    selectedModel,
    modelOptions,
    openPopover,
    setMode,
    setModel,
    openBatchComposer,
    openParameters,
    clearAttachments,
    setMaskAttachment,
    clearMask
  ]);

  const composerLayoutContext = useMemo<ComposerLayoutContext>(() => ({
    mode,
    prompt,
    busy,
    canSubmit,
    hasImageAttachments,
    attachments,
    selectedModel,
    modelOptions,
    statusText,
    expanded,
    attachmentsCount: attachments.length,
    actionContext: composerActionContext,
    actions: {
      changePrompt: setPrompt,
      changeModel: setModel,
      setExpanded,
      toggleExpanded,
      submit,
      handlePromptKeyDown: submitOnEnter,
      removeAttachment,
      addAttachments
    }
  }), [
    mode,
    prompt,
    busy,
    canSubmit,
    hasImageAttachments,
    attachments,
    selectedModel,
    modelOptions,
    statusText,
    expanded,
    composerActionContext,
    setPrompt,
    setModel,
    toggleExpanded,
    submit,
    submitOnEnter,
    removeAttachment,
    addAttachments
  ]);

  return (
    <section
      className={cx(styles.dock, (revealSecondary || hasImageAttachments) && styles.expanded)}
      aria-label={t('composer.aria')}
      data-testid="composer-dock"
      data-composer-expanded={revealSecondary ? 'true' : 'false'}
      data-composer-attachments={attachments.length}
    >
      <div className={styles.commandSurface}>
        <SlotHost<ComposerLayoutContext> slot="composer/attachments" context={composerLayoutContext} as={null} />
        <div className={styles.promptRail}>
          <SlotHost<ComposerLayoutContext> slot="composer/input" context={composerLayoutContext} as={null} />
          <SlotHost<ComposerLayoutContext> slot="composer/actions" context={composerLayoutContext} as={null} />
        </div>
      </div>

      <div className={styles.secondarySurface} hidden={!revealSecondary}>
        <SlotHost<ComposerLayoutContext> slot="composer/status" context={composerLayoutContext} as={null} />
      </div>
    </section>
  );
}
