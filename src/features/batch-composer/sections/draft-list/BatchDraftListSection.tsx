import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { BatchComposerLayoutContext, BatchDraftLayoutContext } from '../../batchComposerTypes';
import styles from './BatchDraftListSection.module.css';

export function BatchDraftListSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  return (
    <div className={styles.draftList}>
      {context.drafts.map((draft, index) => {
        const cardContext: BatchDraftLayoutContext = {
          draft,
          index,
          canRemove: context.drafts.length > 1,
          models: context.models,
          providers: context.providers,
          selectedModel: context.models.find((model) => model.id === draft.selectedModelId) ?? context.models[0] ?? null,
          modelOptions: context.models.map((model) => {
            const provider = context.providers.find((item) => item.id === model.providerId);
            return {
              value: model.id,
              label: model.name || model.modelId,
              description: [model.modelId, provider?.name].filter(Boolean).join(' · ')
            };
          }),
          attachments: [],
          attachmentsCount: 0,
          fileInputs: {
            target: { current: null },
            references: { current: null },
            mask: { current: null }
          },
          actions: {
            patchDraft: (patch) => context.actions.changeDraft(draft.id, patch),
            patchParams: (patch) => context.actions.changeDraftParams(draft.id, { ...draft.params, ...patch }),
            duplicateDraft: () => context.actions.duplicateDraft(draft.id),
            removeDraft: () => context.actions.removeDraft(draft.id),
            openParameters: () => context.actions.openParameters(draft.id),
            addReferences: (files) => context.actions.changeDraft(draft.id, { referenceImages: [...draft.referenceImages, ...files].slice(0, 15), mode: 'edit' }),
            removeAttachment: () => undefined,
            clearAttachments: () => context.actions.changeDraft(draft.id, { targetImage: null, referenceImages: [], mask: null })
          }
        };

        return <SlotHost<BatchDraftLayoutContext> key={draft.id} slot="batch-composer/draft/card" context={cardContext} as={null} />;
      })}
    </div>
  );
}
