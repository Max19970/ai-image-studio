import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition, ProviderGenerationModeId } from '../../domain/providerMode';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { ComposerRequestDraft } from '../../domain/generationTask';
import type { RequestPreset } from '../../entities/request-presets';
import type { ComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import { useEventCallback } from '../../shared/hooks/useEventCallback';
import { DisclosureChevron } from '../../shared/ui';
import type { ComposerDraftReadiness, ComposerQueueSummary } from './model/composerDraftReadiness';
import type { ComposerActionContext, ComposerLayoutContext, ComposerModelOption, ComposerPopoverId } from './composerTypes';
import { useComposerAttachments } from './useComposerAttachments';
import { useComposerOccupiedBlockSize } from './useComposerOccupiedBlockSize';
import { getProviderModeAttachmentStatusText } from '../../entities/provider/attachmentCompatibility';
import { getProviderModelOptions, getSelectedModel } from '../../entities/provider/modelOptions';
import { resolveProviderControlSurface } from '../../entities/provider/controlSurface';
import { ComposerContextSection } from './sections/context/ComposerContextSection';
import { ComposerQueuePanel } from './sections/queue/ComposerQueuePanel';
import styles from './ComposerLayout.module.css';

const contextPreferenceKey = 'image-studio.composer.context-expanded';
const queuePopoverId = 'composer.queue';

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
  drafts: ComposerRequestDraft[];
  activeDraftId: string;
  draftReadiness: ComposerDraftReadiness[];
  queueSummary: ComposerQueueSummary;
  intervalSeconds: number;
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
  drafts,
  activeDraftId,
  draftReadiness,
  queueSummary,
  intervalSeconds,
  commands
}: Props) {
  const { t } = useI18n();
  const [openPopover, setOpenPopover] = useState<ComposerPopoverId>(null);
  const [expanded, setExpandedState] = useState(() => {
    try {
      return localStorage.getItem(contextPreferenceKey) === 'true';
    } catch {
      return false;
    }
  });
  const dockRef = useComposerOccupiedBlockSize();
  const attachmentsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const selectedModel = useMemo(() => getSelectedModel(models, selectedModelId), [models, selectedModelId]);
  const controlSurface = useMemo(
    () => resolveProviderControlSurface({ settings: studioSettings, modelId: selectedModelId, models, providers }).surface,
    [models, providers, selectedModelId, studioSettings]
  );
  const queueOpen = openPopover === queuePopoverId;

  const setExpanded = useCallback((value: boolean) => {
    setExpandedState(value);
    try {
      localStorage.setItem(contextPreferenceKey, String(value));
    } catch {
      // UI preference persistence is best-effort.
    }
  }, []);
  const toggleExpanded = useCallback(() => setExpanded(!expanded), [expanded, setExpanded]);

  useEffect(() => {
    if (!queueOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      const targetNode = target instanceof Node ? target : null;
      const targetElement = target instanceof Element ? target : null;
      if (targetNode && dockRef.current?.contains(targetNode)) return;
      if (targetElement?.closest('[data-floating-popover-layer="true"]')) return;
      setOpenPopover(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[data-floating-popover-layer="true"]')) return;
      setOpenPopover(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [dockRef, queueOpen]);

  const setProviderMode = useEventCallback(commands.setProviderMode);
  const setModel = useEventCallback(commands.setModel);
  const setPrompt = useEventCallback(commands.setPrompt);
  const changeParams = useEventCallback(commands.patchParams);
  const submit = useEventCallback(commands.submit);
  const openParameters = useEventCallback(commands.openParameters);
  const addDraft = useEventCallback(commands.addDraft);
  const duplicateDraft = useEventCallback(commands.duplicateDraft);
  const removeDraft = useEventCallback(commands.removeDraft);
  const selectDraft = useEventCallback(commands.selectDraft);
  const setIntervalSeconds = useEventCallback(commands.setIntervalSeconds);
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
  const activeReadiness = draftReadiness.find((item) => item.draftId === activeDraftId);
  const blockedReason = useMemo(() => {
    if (activeReadiness?.ready) return null;
    if (!selectedModel) return t('composer.blockedModel');
    if (!prompt.trim()) return t('composer.blockedPrompt');
    return getProviderModeAttachmentStatusText({
      draft: { targetImage, referenceImages, mask },
      providerMode,
      t
    }) ?? t('composer.blockedRequest');
  }, [activeReadiness?.ready, mask, prompt, providerMode, referenceImages, selectedModel, t, targetImage]);
  const hasStatusContent = Boolean(statusText || (blockedReason && prompt.trim()));

  const modelOptions = useMemo<ComposerModelOption[]>(() => getProviderModelOptions(models, providers), [models, providers]);
  const submitOnEnter = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void commands.submit();
    }
  }, [commands]);

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
    activeDraftId,
    draftsCount: drafts.length,
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
      addDraft,
      duplicateActiveDraft: () => duplicateDraft(activeDraftId),
      removeActiveDraft: () => removeDraft(activeDraftId),
      openParameters,
      clearAttachments,
      setMask,
      clearMask: () => setMask(null),
      openAttachmentPicker: () => attachmentsRef.current?.click(),
      openMaskPicker: () => maskRef.current?.click()
    },
    requestPresetActions: commands.requestPresets
  }), [
    activeDraftId,
    addDraft,
    attachments.length,
    changeParams,
    clearAttachments,
    controlSurface,
    drafts.length,
    duplicateDraft,
    mask,
    modelOptions,
    models,
    openParameters,
    openPopover,
    params,
    provider,
    providerMode,
    providerModes,
    providers,
    removeDraft,
    requestPresets,
    selectedModel,
    setMask,
    setModel,
    setProviderMode,
    studioSettings,
    commands.requestPresets
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
    drafts,
    activeDraftId,
    draftReadiness,
    queueSummary,
    intervalSeconds,
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
      addAttachments,
      selectDraft,
      addDraft,
      duplicateDraft,
      removeDraft,
      setIntervalSeconds
    }
  }), [
    activeDraftId,
    addAttachments,
    addDraft,
    attachments,
    blockedReason,
    busy,
    canSubmit,
    changeParams,
    composerActionContext,
    controlSurface,
    draftReadiness,
    drafts,
    duplicateDraft,
    expanded,
    hasImageAttachments,
    intervalSeconds,
    modelOptions,
    models,
    params,
    prompt,
    provider,
    providerMode,
    providerModes,
    providers,
    queueSummary,
    removeAttachment,
    removeDraft,
    selectDraft,
    selectedModel,
    setExpanded,
    setIntervalSeconds,
    setModel,
    setPrompt,
    statusText,
    studioSettings,
    submit,
    submitOnEnter,
    toggleExpanded
  ]);

  return (
    <section
      ref={dockRef}
      className={cx(styles.dock, (expanded || hasStatusContent || hasImageAttachments) && styles.expanded)}
      aria-label={t('composer.aria')}
      data-testid="composer-dock"
      data-composer-expanded={expanded ? 'true' : 'false'}
      data-composer-attachments={attachments.length}
      data-composer-queue-open={queueOpen ? 'true' : 'false'}
    >
      {queueOpen && <ComposerQueuePanel context={composerLayoutContext} onClose={() => setOpenPopover(null)} />}

      <div className={styles.commandSurface}>
        <div className={styles.contextToggleRow}>
          <button
            type="button"
            className={styles.contextToggleButton}
            data-testid="composer-context-toggle"
            data-expanded={expanded ? 'true' : 'false'}
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-label={t(expanded ? 'composer.hideContext' : 'composer.showContext')}
            title={t(expanded ? 'composer.hideContext' : 'composer.showContext')}
          >
            <DisclosureChevron direction={expanded ? 'down' : 'up'} />
          </button>
        </div>
        <div
          className={styles.contextRegion}
          data-testid="composer-context-region"
          data-expanded={expanded ? 'true' : 'false'}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className={styles.contextRegionInner}>
            <ComposerContextSection context={composerLayoutContext} />
          </div>
        </div>
        <SlotHost<ComposerLayoutContext> slot="composer/attachments" context={composerLayoutContext} as={null} />
        <div className={styles.promptRail}>
          <SlotHost<ComposerLayoutContext> slot="composer/input" context={composerLayoutContext} as={null} />
          <SlotHost<ComposerLayoutContext> slot="composer/actions" context={composerLayoutContext} as={null} />
        </div>
      </div>

      <div className={styles.secondarySurface} hidden={!hasStatusContent}>
        <SlotHost<ComposerLayoutContext> slot="composer/status" context={composerLayoutContext} as={null} />
      </div>
    </section>
  );
}
