import { memo, useMemo } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { BatchComposerDraft } from '../../../../domain/generationTask';
import type { BatchComposerLayoutContext, BatchDraftLayoutContext } from '../../batchComposerTypes';
import type { I18nContextValue } from '../../../../shared/i18n/types';
import { useI18n } from '../../../../i18n';
import { getProviderModelOptions } from '../../../../entities/provider/modelOptions';
import { resolveProviderControlSurface } from '../../../../entities/provider/controlSurface';
import { toProviderSettings } from '../../../../entities/studio-settings';
import styles from './BatchDraftListSection.module.css';
import queueStyles from './BatchQueueRail.module.css';
import editorStyles from './BatchSelectedEditor.module.css';

function getAttachmentCount(draft: BatchComposerDraft) {
  return (draft.targetImage ? 1 : 0) + draft.referenceImages.length + (draft.mask ? 1 : 0);
}

function isDraftReady(draft: BatchComposerDraft) {
  const hasPrompt = Boolean(draft.params.prompt.trim());
  const hasImages = getAttachmentCount(draft) > 0;
  return hasPrompt && (draft.mode === 'generate' || hasImages);
}

function getDraftIssue(draft: BatchComposerDraft, t: I18nContextValue['t']) {
  if (!draft.params.prompt.trim()) return t('batch.needsPrompt');
  if (draft.mode === 'edit' && getAttachmentCount(draft) === 0) return t('batch.needsImages');
  return t('batch.ready');
}

interface BatchQueueItemProps {
  draft: BatchComposerDraft;
  index: number;
  selected: boolean;
  t: I18nContextValue['t'];
  onSelectDraft: (id: string) => void;
}

const BatchQueueItem = memo(function BatchQueueItem({ draft, index, selected, t, onSelectDraft }: BatchQueueItemProps) {
  const ready = isDraftReady(draft);
  const prompt = draft.params.prompt.trim() || t('batch.emptyPrompt');
  const attachments = getAttachmentCount(draft);
  const expectedImages = Math.max(1, Number(draft.params.n || 1));

  return (
    <li>
      <button
        type="button"
        className={`${queueStyles.queueItem} ${selected ? queueStyles.queueItemSelected : ''} ${ready ? queueStyles.queueItemReady : queueStyles.queueItemNeedsWork}`}
        onClick={() => onSelectDraft(draft.id)}
        aria-current={selected ? 'true' : undefined}
      >
        <span className={queueStyles.queueIndex}>{index + 1}</span>
        <span className={queueStyles.queueCopy}>
          <strong>{prompt}</strong>
          <span>{getDraftIssue(draft, t)}</span>
        </span>
        <span className={queueStyles.queueMeta}>
          <span>{draft.mode === 'edit' ? t('composer.edit') : t('composer.generate')}</span>
          <span>{t('batch.queueImagesValue', { count: expectedImages })}</span>
          <span>{t('batch.queueAttachmentsValue', { count: attachments })}</span>
        </span>
      </button>
    </li>
  );
});

function createDraftContext(
  context: BatchComposerLayoutContext,
  draft: BatchComposerDraft,
  index: number,
  modelOptions: BatchDraftLayoutContext['modelOptions']
): BatchDraftLayoutContext {
  const controlContext = resolveProviderControlSurface({
    settings: context.studioSettings,
    modelId: draft.selectedModelId,
    models: context.models,
    providers: context.providers
  });

  return {
    draft,
    index,
    canRemove: context.drafts.length > 1,
    models: context.models,
    providers: context.providers,
    provider: toProviderSettings(controlContext.provider, controlContext.model),
    studioSettings: context.studioSettings,
    controlSurface: controlContext.surface,
    selectedModel: controlContext.model,
    modelOptions,
    attachments: [],
    attachmentsCount: 0,
    fileInputs: {
      attachments: { current: null },
      mask: { current: null }
    },
    actions: {
      patchDraft: (patch) => context.actions.changeDraft(draft.id, patch),
      patchParams: (patch) => context.actions.changeDraftParams(draft.id, { ...draft.params, ...patch }),
      duplicateDraft: () => context.actions.duplicateDraft(draft.id),
      removeDraft: () => context.actions.removeDraft(draft.id),
      openParameters: () => context.actions.openParameters(draft.id),
      addAttachments: (files) => context.actions.changeDraft(draft.id, { targetImage: null, referenceImages: [...draft.referenceImages, ...files].slice(0, 16), mode: 'edit' }),
      removeAttachment: () => undefined,
      clearAttachments: () => context.actions.changeDraft(draft.id, { targetImage: null, referenceImages: [], mask: null })
    }
  };
}

export function BatchDraftListSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  const { t } = useI18n();
  const selectedDraft = useMemo(
    () => context.drafts.find((draft) => draft.id === context.selectedDraftId) ?? context.drafts[0] ?? null,
    [context.drafts, context.selectedDraftId]
  );
  const selectedIndex = useMemo(
    () => selectedDraft ? context.drafts.findIndex((draft) => draft.id === selectedDraft.id) : -1,
    [context.drafts, selectedDraft]
  );
  const modelOptions = useMemo(() => getProviderModelOptions(context.models, context.providers), [context.models, context.providers]);
  const selectedDraftContext = useMemo(
    () => selectedDraft ? createDraftContext(context, selectedDraft, selectedIndex, modelOptions) : null,
    [
      context.actions,
      context.drafts.length,
      context.models,
      context.providers,
      context.studioSettings,
      selectedDraft,
      selectedIndex,
      modelOptions
    ]
  );

  if (!selectedDraft || !selectedDraftContext) {
    return (
      <div className={styles.emptyQueue}>
        <strong>{t('batch.emptyQueueTitle')}</strong>
        <p>{t('batch.emptyQueueText')}</p>
      </div>
    );
  }

  return (
    <div className={styles.workbench} data-testid="batch-queue-workbench">
      <aside className={queueStyles.queueRail} aria-label={t('batch.queueLabel')}>
        <div className={queueStyles.queueHeader}>
          <div>
            <span className="section-kicker">{t('batch.queueKicker')}</span>
            <strong>{t('batch.queueTitle')}</strong>
          </div>
          <span>{context.validDrafts}/{context.drafts.length}</span>
        </div>

        <ol className={queueStyles.queueList}>
          {context.drafts.map((draft, index) => (
            <BatchQueueItem
              key={draft.id}
              draft={draft}
              index={index}
              selected={draft.id === selectedDraft.id}
              t={t}
              onSelectDraft={context.actions.selectDraft}
            />
          ))}
        </ol>
      </aside>

      <section className={editorStyles.selectedEditor} aria-label={t('batch.selectedEditorLabel')}>
        <header className={editorStyles.selectedHeader}>
          <div>
            <span className="section-kicker">{t('batch.selectedKicker')}</span>
            <h3>{t('batch.requestLabel', { index: selectedIndex + 1 })}</h3>
          </div>
          <span className={isDraftReady(selectedDraft) ? editorStyles.readyPill : editorStyles.issuePill}>{getDraftIssue(selectedDraft, t)}</span>
        </header>
        <SlotHost<BatchDraftLayoutContext>
          key={selectedDraft.id}
          slot="batch-composer/draft/card"
          context={selectedDraftContext}
          as={null}
        />
      </section>
    </div>
  );
}
