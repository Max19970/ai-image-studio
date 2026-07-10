import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../domain/providerMode';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { RequestPreset } from '../../entities/request-presets';
import type { ComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import { useEventCallback } from '../../shared/hooks/useEventCallback';
import type { ComposerActionContext, ComposerLayoutContext, ComposerModelOption, ComposerPopoverId } from './composerTypes';
import { useComposerAttachments } from './useComposerAttachments';
import { useComposerOccupiedBlockSize } from './useComposerOccupiedBlockSize';
import { getProviderModeAttachmentStatusText } from '../../entities/provider/attachmentCompatibility';
import { getProviderModelOptions, getSelectedModel } from '../../entities/provider/modelOptions';
import { resolveProviderControlSurface } from '../../entities/provider/controlSurface';
import styles from './ComposerLayout.module.css';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface Props {
  providerModeId: ProviderGenerationModeId;
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  prompt: string;
  params: ImageParams;
  provider: ProviderSettings;
  studioSettings: StudioSettings;
  busy: boolean;
  canSubmit: boolean;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModelId: string;
  statusText?: string | null;
  requestPresets: RequestPreset[];
  commands: ComposerCommands;
}

export function ImageComposer({
  providerMode,
  providerModes,
  prompt,
  params,
  provider,
  studioSettings,
  busy,
  canSubmit,
  targetImage,
  referenceImages,
  mask,
  models,
  providers,
  selectedModelId,
  statusText,
  requestPresets,
  commands
}: Props) {
  const { t } = useI18n();
  const [openPopover, setOpenPopover] = useState<ComposerPopoverId>(null);
  const [expanded, setExpanded] = useState(false);
  const dockRef = useComposerOccupiedBlockSize();
  const attachmentsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const selectedModel = useMemo(() => getSelectedModel(models, selectedModelId), [models, selectedModelId]);
  const controlSurface = useMemo(() => resolveProviderControlSurface({ settings: studioSettings, modelId: selectedModelId, models, providers }).surface, [models, providers, selectedModelId, studioSettings]);
  const setProviderMode = useEventCallback(commands.setProviderMode);
  const setModel = useEventCallback(commands.setModel);
  const setPrompt = useEventCallback(commands.setPrompt);
  const changeParams = useEventCallback(commands.patchParams);
  const submit = useEventCallback(commands.submit);
  const openParameters = useEventCallback(commands.openParameters);
  const openBatchComposer = useEventCallback(commands.openBatchComposer);
  const addCurrentToBatchComposer = useEventCallback(commands.addCurrentToBatchComposer);
  const setTargetImage = useEventCallback(commands.setTargetImage);
  const setReferenceImages = useEventCallback(commands.setReferenceImages);
  const setImageAttachments = useEventCallback(commands.setImageAttachments);
  const setMask = useEventCallback(commands.setMask);

  const getAttachmentLabel = useCallback((index: number) => t('composer.imageAttachmentLabel', { index }), [t]);
  const composerAttachments = useComposerAttachments({
    providerMode,
    targetImage,
    referenceImages,
    mask,
    actions: {
      setTargetImage,
      setReferenceImages,
      setImageAttachments,
      setMask
    },
    labels: {
      mask: t('composer.mask'),
      imageAttachment: getAttachmentLabel
    }
  });
  const { attachments, hasImageAttachments, removeAttachment, clearAttachments, addAttachments } = composerAttachments;
  const blockedReason = useMemo(() => {
    if (canSubmit) return null;
    if (!selectedModel) return t('composer.blockedModel');
    if (!prompt.trim()) return t('composer.blockedPrompt');
    return getProviderModeAttachmentStatusText({
      draft: { targetImage, referenceImages, mask },
      providerMode,
      t
    }) ?? t('composer.blockedRequest');
  }, [canSubmit, mask, prompt, providerMode, referenceImages, selectedModel, t, targetImage]);
  const hasStatusContent = Boolean(statusText || (blockedReason && prompt.trim()));
  const revealSecondary = expanded || hasStatusContent;

  const modelOptions = useMemo<ComposerModelOption[]>(() => getProviderModelOptions(models, providers), [models, providers]);

  const setMaskAttachment = useCallback((file: File | null) => {
    setMask(file);
  }, [setMask]);

  const clearMask = useCallback(() => {
    setMask(null);
  }, [setMask]);

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
    providerMode,
    providerModes,
    attachmentsCount: attachments.length,
    hasMask: Boolean(mask),
    params,
    provider,
    studioSettings,
    controlSurface,
    models,
    providers,
    selectedModel,
    modelOptions,
    requestPresets,
    openPopover,
    setOpenPopover,
    fileInputs: {
      attachments: attachmentsRef,
      mask: maskRef
    },
    actions: {
      setProviderMode,
      changeModel: setModel,
      changeParams,
      openBatchComposer,
      addCurrentToBatchComposer,
      openParameters,
      clearAttachments,
      setMask: setMaskAttachment,
      clearMask,
      openAttachmentPicker: () => attachmentsRef.current?.click(),
      openMaskPicker: () => maskRef.current?.click()
    },
    requestPresetActions: commands.requestPresets
  }), [
    providerMode,
    providerModes,
    attachments.length,
    mask,
    params,
    provider,
    studioSettings,
    controlSurface,
    models,
    providers,
    selectedModel,
    modelOptions,
    requestPresets,
    openPopover,
    commands.requestPresets,
    setProviderMode,
    setModel,
    changeParams,
    openBatchComposer,
    addCurrentToBatchComposer,
    openParameters,
    clearAttachments,
    setMaskAttachment,
    clearMask
  ]);

  const composerLayoutContext = useMemo<ComposerLayoutContext>(() => ({
    providerMode,
    providerModes,
    prompt,
    busy,
    canSubmit,
    hasImageAttachments,
    attachments,
    params,
    provider,
    studioSettings,
    controlSurface,
    models,
    providers,
    selectedModel,
    modelOptions,
    statusText,
    blockedReason,
    expanded,
    attachmentsCount: attachments.length,
    actionContext: composerActionContext,
    actions: {
      changePrompt: setPrompt,
      changeModel: setModel,
      changeParams,
      setExpanded,
      toggleExpanded,
      submit,
      handlePromptKeyDown: submitOnEnter,
      removeAttachment,
      addAttachments
    }
  }), [
    providerMode,
    providerModes,
    prompt,
    busy,
    canSubmit,
    hasImageAttachments,
    attachments,
    params,
    provider,
    studioSettings,
    controlSurface,
    models,
    providers,
    selectedModel,
    modelOptions,
    statusText,
    blockedReason,
    expanded,
    composerActionContext,
    setPrompt,
    setModel,
    changeParams,
    toggleExpanded,
    submit,
    submitOnEnter,
    removeAttachment,
    addAttachments
  ]);

  return (
    <section
      ref={dockRef}
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
