import { useState, type ReactNode } from 'react';
import type { BatchGenerationItem, GeneratedImage, GenerationStatus, GenerationTask } from '../../../../domain/generationTask';
import { cancelServerBatchGenerationItem } from '../../../../processes/server-generation-actions';
import { useI18n } from '../../../../i18n';
import { getProviderDetailDescriptor } from '../../model/detailDescriptors';
import {
  AttachmentsSection,
  DataRow,
  type DetailInspectorTab,
  InspectorGroup,
  RequestMetaRows,
  RunStatusRows,
  RuntimeRows,
  SentParamsRows,
  TechnicalBlocks,
  TechnicalDetails,
  visible
} from './DetailSnapshotShared';
import styles from './DetailSnapshotSections.module.css';

export type { DetailInspectorTab } from './DetailSnapshotShared';

function SingleSnapshotSections({ task, activeImage, activeMobileTab }: { task: GenerationTask; activeImage: GeneratedImage | null; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  const snapshot = task.request;

  return (
    <div className={styles.inspectorStack} data-detail-slot="request-single">
      {visible(activeMobileTab, 'prompt') && (
        <InspectorGroup title={t('detail.prompt')} kicker={t('detail.intent')}>
          <p className={styles.promptText}>{snapshot.prompt || t('detail.noPrompt')}</p>
          {snapshot.warnings.length > 0 && <div className="warning-strip compact">{snapshot.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
        </InspectorGroup>
      )}

      {visible(activeMobileTab, 'files') && (
        <InspectorGroup title={t('detail.attachments')} kicker={t('detail.files')}>
          <AttachmentsSection attachments={snapshot.attachments} />
        </InspectorGroup>
      )}

      {visible(activeMobileTab, 'params') && <SingleParamsSections task={task} />}

      {visible(activeMobileTab, 'technical') && (
        <InspectorGroup title={t('detail.technical')} kicker={t('detail.developerData')}>
          <TechnicalBlocks snapshot={snapshot} raw={task.raw} activeImage={activeImage} />
        </InspectorGroup>
      )}
    </div>
  );
}

function SingleParamsSections({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  const snapshot = task.request;
  const descriptor = getProviderDetailDescriptor(snapshot);

  return (
    <>
      <InspectorGroup title={t('detail.runStatus')} kicker={t('detail.result')}>
        <RunStatusRows task={task} />
        {task.error && <div className="error-strip compact">{task.error}</div>}
      </InspectorGroup>
      <InspectorGroup title={t(descriptor.parameterTitleKey)} kicker={t(descriptor.parameterKickerKey)}>
        <SentParamsRows snapshot={snapshot} raw={task.raw} />
      </InspectorGroup>
      <RuntimeRows snapshot={snapshot} raw={task.raw} />
      <InspectorGroup title={t(descriptor.metadataTitleKey)} kicker={t(descriptor.metadataKickerKey)}>
        <RequestMetaRows snapshot={snapshot} />
      </InspectorGroup>
    </>
  );
}

function BatchRequestSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.batchRequestSection}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

const cancellableBatchItemStatuses = new Set<GenerationStatus>(['queued', 'sending', 'running', 'retrying']);

function BatchRequestCard({ item, activeMobileTab, cancelling, onCancel }: {
  item: BatchGenerationItem;
  activeMobileTab?: DetailInspectorTab;
  cancelling: boolean;
  onCancel: (itemId: string) => void;
}) {
  const { t } = useI18n();
  const canCancel = cancellableBatchItemStatuses.has(item.status);

  return (
    <details className={styles.batchRequestCard} open>
      <summary>
        <span>{t('detail.batchRequestTitle', { index: item.index + 1 })}</span>
        <span className={styles.batchRequestSummaryActions}>
          <span className={`status-pill tiny ${item.status}`}>{t(`status.${item.status}`)}</span>
          {canCancel && <CancelBatchItemButton item={item} cancelling={cancelling} onCancel={onCancel} />}
        </span>
      </summary>
      <BatchRequestBody item={item} activeMobileTab={activeMobileTab} />
    </details>
  );
}

function CancelBatchItemButton({ item, cancelling, onCancel }: { item: BatchGenerationItem; cancelling: boolean; onCancel: (itemId: string) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={styles.cancelBatchItemButton}
      disabled={cancelling}
      aria-label={t('detail.cancelBatchItemAria', { index: item.index + 1 })}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCancel(item.id);
      }}
    >
      {cancelling ? t('detail.cancelBatchItemPending') : t('detail.cancelBatchItem')}
    </button>
  );
}

function BatchRequestBody({ item, activeMobileTab }: { item: BatchGenerationItem; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  return (
    <div className={styles.batchRequestBody}>
      {visible(activeMobileTab, 'prompt') && (
        <BatchRequestSection title={t('detail.prompt')}>
          <p className={styles.promptText}>{item.request.prompt || t('detail.noPrompt')}</p>
          {item.request.warnings.length > 0 && <div className="warning-strip compact">{item.request.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
          {item.error && <div className="error-strip compact">{item.error}</div>}
        </BatchRequestSection>
      )}
      {visible(activeMobileTab, 'files') && <BatchRequestSection title={t('detail.attachments')}><AttachmentsSection attachments={item.request.attachments} /></BatchRequestSection>}
      {visible(activeMobileTab, 'params') && <BatchRequestParams item={item} />}
      {visible(activeMobileTab, 'technical') && <BatchRequestSection title={t('detail.technical')}><TechnicalBlocks snapshot={item.request} raw={item.raw} /></BatchRequestSection>}
    </div>
  );
}

function BatchRequestParams({ item }: { item: BatchGenerationItem }) {
  const { t } = useI18n();
  return (
    <BatchRequestSection title={t('detail.parameters')}>
      <div className={styles.detailGrid}>
        <DataRow label={t('detail.images')} value={item.images.length} />
        <DataRow label={t('detail.mode')} value={t(`gallery.mode.${item.request.mode}`)} />
        <DataRow label={t('detail.model')} value={item.request.modelLabel || item.request.model || t('detail.notSet')} />
        <DataRow label={t('detail.endpoint')} value={item.request.endpoint || t('detail.notSet')} />
      </div>
      <SentParamsRows snapshot={item.request} raw={item.raw} />
      <RuntimeRows snapshot={item.request} raw={item.raw} />
    </BatchRequestSection>
  );
}

function BatchSnapshotSections({ task, activeMobileTab }: { task: GenerationTask; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  const [cancellingItemIds, setCancellingItemIds] = useState<Set<string>>(() => new Set());
  if (!task.batch) return null;

  const cancelBatchItem = (itemId: string) => {
    setCancellingItemIds((current) => new Set(current).add(itemId));
    void cancelServerBatchGenerationItem(task.id, itemId)
      .catch((error) => console.error('[detail] failed to cancel batch item:', error))
      .finally(() => setCancellingItemIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      }));
  };

  return (
    <div className={styles.inspectorStack} data-detail-slot="request-batch">
      {visible(activeMobileTab, 'params') && <BatchRunStatus task={task} batch={task.batch} />}
      {visible(activeMobileTab, 'technical') && (
        <InspectorGroup title={t('detail.technical')} kicker={t('detail.developerData')}>
          <div className={styles.technicalStack}>
            <TechnicalDetails title={t('detail.payloadJson')} value={task.request.payload} />
            <TechnicalDetails title={t('detail.responsePayload')} value={task.raw} />
          </div>
        </InspectorGroup>
      )}
      <InspectorGroup title={t('detail.batchGeneratedImage')} kicker={t('detail.batchRequests')}>
        <div className={styles.batchList}>{task.batch.items.map((item) => <BatchRequestCard key={item.id} item={item} activeMobileTab={activeMobileTab} cancelling={cancellingItemIds.has(item.id)} onCancel={cancelBatchItem} />)}</div>
      </InspectorGroup>
    </div>
  );
}

function BatchRunStatus({ task, batch }: { task: GenerationTask; batch: NonNullable<GenerationTask['batch']> }) {
  const { t } = useI18n();
  return (
    <InspectorGroup title={t('detail.runStatus')} kicker={t('detail.result')}>
      <RunStatusRows task={task} />
      <div className={styles.detailGrid}>
        <DataRow label={t('detail.batchRequests')} value={batch.items.length} />
        <DataRow label={t('detail.batchInterval')} value={`${batch.intervalMs / 1000}s`} />
      </div>
    </InspectorGroup>
  );
}

export function SnapshotSections({ task, activeImage, activeMobileTab }: { task: GenerationTask; activeImage: GeneratedImage | null; activeMobileTab?: DetailInspectorTab }) {
  if (task.batch) return <BatchSnapshotSections task={task} activeMobileTab={activeMobileTab} />;
  return <SingleSnapshotSections task={task} activeImage={activeImage} activeMobileTab={activeMobileTab} />;
}
