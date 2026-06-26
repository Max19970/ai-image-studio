import { useEffect, useMemo, useState } from 'react';
import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { RequestPreset } from '../../entities/request-presets';
import type { BatchComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { hasProviderModeRequiredAttachments } from '../../entities/provider/compatibility';
import { resolveProviderGenerationMode } from '../../entities/provider/modeResolution';
import { SlotHost } from '../../interface/SlotHost';
import { useEventCallback } from '../../shared/hooks/useEventCallback';
import type { BatchComposerLayoutContext } from './batchComposerTypes';
import styles from './MultiImageComposer.module.css';

interface Props {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  studioSettings: StudioSettings;
  requestPresets: RequestPreset[];
  commands: BatchComposerCommands;
}

export function MultiImageComposer({
  drafts,
  intervalSeconds,
  busy,
  canSubmit,
  models,
  providers,
  studioSettings,
  requestPresets,
  commands
}: Props) {
  const { t } = useI18n();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(() => drafts[0]?.id ?? null);

  useEffect(() => {
    if (drafts.length === 0) {
      setSelectedDraftId(null);
      return;
    }
    if (!selectedDraftId || !drafts.some((draft) => draft.id === selectedDraftId)) {
      setSelectedDraftId(drafts[0].id);
    }
  }, [drafts, selectedDraftId]);

  const setIntervalSeconds = useEventCallback(commands.setIntervalSeconds);
  const patchDraft = useEventCallback(commands.patchDraft);
  const patchDraftParams = useEventCallback(commands.patchDraftParams);
  const addDraft = useEventCallback(commands.addDraft);
  const duplicateDraft = useEventCallback(commands.duplicateDraft);
  const removeDraft = useEventCallback(commands.removeDraft);
  const openParameters = useEventCallback(commands.openParameters);
  const submit = useEventCallback(commands.submit);
  const close = useEventCallback(commands.close);

  const totalImages = useMemo(
    () => drafts.reduce((sum, draft) => sum + Math.max(1, Number(draft.params.n || 1)), 0),
    [drafts]
  );

  const validDrafts = useMemo(() => drafts.filter((draft) => {
    const hasPrompt = Boolean(draft.params.prompt.trim());
    const model = models.find((item) => item.id === draft.selectedModelId) ?? null;
    const providerMode = resolveProviderGenerationMode({
      settings: studioSettings,
      modelId: draft.selectedModelId,
      providerModeId: draft.providerModeId,
      models,
      providers
    }).activeMode;
    return Boolean(model) && hasPrompt && hasProviderModeRequiredAttachments({
      targetImage: draft.targetImage,
      referenceImages: draft.referenceImages,
      mask: draft.mask
    }, providerMode);
  }).length, [drafts, models, providers, studioSettings]);

  const selectedDraftIndex = useMemo(() => drafts.findIndex((draft) => draft.id === selectedDraftId), [drafts, selectedDraftId]);

  const submitWithPreflight = useEventCallback(() => {
    if (validDrafts < drafts.length) {
      const ok = window.confirm(t('batch.partialSubmitConfirm', { valid: validDrafts, total: drafts.length }));
      if (!ok) return;
    }
    submit();
  });

  const contextActions = useMemo<BatchComposerLayoutContext['actions']>(() => ({
    changeIntervalSeconds: setIntervalSeconds,
    changeDraft: patchDraft,
    changeDraftParams: patchDraftParams,
    selectDraft: setSelectedDraftId,
    addDraft,
    duplicateDraft,
    removeDraft,
    openParameters,
    submit: submitWithPreflight,
    cancel: close,
    requestPresets: commands.requestPresets
  }), [
    setIntervalSeconds,
    patchDraft,
    patchDraftParams,
    addDraft,
    duplicateDraft,
    removeDraft,
    openParameters,
    submitWithPreflight,
    close,
    commands.requestPresets
  ]);

  const context = useMemo<BatchComposerLayoutContext>(() => ({
    drafts,
    intervalSeconds,
    busy,
    canSubmit,
    models,
    providers,
    studioSettings,
    totalImages,
    validDrafts,
    selectedDraftId,
    selectedDraftIndex,
    requestPresets,
    actions: contextActions
  }), [
    drafts,
    intervalSeconds,
    busy,
    canSubmit,
    models,
    providers,
    studioSettings,
    totalImages,
    validDrafts,
    selectedDraftId,
    selectedDraftIndex,
    requestPresets,
    contextActions
  ]);

  return (
    <section className={styles.stage} data-testid="batch-composer-stage" aria-label={t('batch.aria')}>
      <div className={`${styles.shell} glass-panel`}>
        <SlotHost<BatchComposerLayoutContext> slot="batch-composer/header" context={context} as={null} />
        <SlotHost<BatchComposerLayoutContext> slot="batch-composer/controls" context={context} as={null} />
        <SlotHost<BatchComposerLayoutContext> slot="batch-composer/drafts" context={context} as={null} />
        <SlotHost<BatchComposerLayoutContext> slot="batch-composer/footer" context={context} as={null} />
      </div>
    </section>
  );
}
