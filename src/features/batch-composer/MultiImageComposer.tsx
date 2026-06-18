import { useMemo } from 'react';
import type { BatchComposerDraft } from '../../domain/generationTask';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import type { BatchComposerCommands } from '../../interface/context/commands';
import { useI18n } from '../../i18n';
import { SlotHost } from '../../interface/SlotHost';
import type { BatchComposerLayoutContext } from './batchComposerTypes';
import styles from './MultiImageComposer.module.css';

interface Props {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  commands: BatchComposerCommands;
}

export function MultiImageComposer({
  drafts,
  intervalSeconds,
  busy,
  canSubmit,
  models,
  providers,
  commands
}: Props) {
  const { t } = useI18n();
  const totalImages = drafts.reduce((sum, draft) => sum + Math.max(1, Number(draft.params.n || 1)), 0);
  const validDrafts = drafts.filter((draft) => draft.params.prompt.trim() && (draft.mode === 'generate' || draft.targetImage)).length;

  const context = useMemo<BatchComposerLayoutContext>(() => ({
    drafts,
    intervalSeconds,
    busy,
    canSubmit,
    models,
    providers,
    totalImages,
    validDrafts,
    actions: {
      changeIntervalSeconds: commands.setIntervalSeconds,
      changeDraft: commands.patchDraft,
      changeDraftParams: commands.patchDraftParams,
      addDraft: commands.addDraft,
      duplicateDraft: commands.duplicateDraft,
      removeDraft: commands.removeDraft,
      openParameters: commands.openParameters,
      submit: commands.submit,
      cancel: commands.close
    }
  }), [
    drafts,
    intervalSeconds,
    busy,
    canSubmit,
    models,
    providers,
    totalImages,
    validDrafts,
    commands.setIntervalSeconds,
    commands.patchDraft,
    commands.patchDraftParams,
    commands.addDraft,
    commands.duplicateDraft,
    commands.removeDraft,
    commands.openParameters,
    commands.submit,
    commands.close
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
