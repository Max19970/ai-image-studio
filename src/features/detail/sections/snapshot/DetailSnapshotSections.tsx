import { useState, type ReactNode } from 'react';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationStatus, GenerationTask } from '../../../../domain/generationTask';
import { cancelServerBatchGenerationItem } from '../../../../infrastructure/api';
import { useI18n } from '../../../../i18n';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import { cx, expectedImageCount } from '../../model/detailHelpers';
import { createDetailDescriptorContext, getProviderDetailDescriptor, type DetailDataRow } from '../../model/detailDescriptors';
import styles from './DetailSnapshotSections.module.css';

export type DetailInspectorTab = 'prompt' | 'params' | 'files' | 'technical';

function DataRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value === '' || value === null || value === undefined ? t('detail.omit') : String(value)}</strong>
    </div>
  );
}

function InspectorGroup({ title, kicker, children, className }: { title: string; kicker?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx(styles.group, className)}>
      <header className={styles.groupHeader}>
        {kicker && <span className="section-kicker">{kicker}</span>}
        <h3>{title}</h3>
      </header>
      <div className={styles.groupBody}>{children}</div>
    </section>
  );
}

function TechnicalDetails({ title, value, defaultOpen = false }: { title: string; value: unknown; defaultOpen?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <details className={styles.technicalDetails} open={defaultOpen}>
      <summary>{title}</summary>
      <pre className="code-panel">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function attachmentToPreviewItem(attachment: AttachmentSummary, index: number, label: string): AttachmentPreviewItem {
  return {
    id: `${attachment.role}-${attachment.name}-${index}`,
    role: attachment.role,
    label,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    previewUrl: attachment.previewUrl
  };
}

function AttachmentsSection({ attachments }: { attachments: AttachmentSummary[] }) {
  const { t } = useI18n();
  const imageAttachments = attachments.filter((item) => item.role !== 'mask');
  const maskAttachments = attachments.filter((item) => item.role === 'mask');

  if (attachments.length === 0) {
    return <p className="muted-copy">{t('detail.noAttachments')}</p>;
  }

  const imageItems = imageAttachments.map((item, index) => attachmentToPreviewItem(item, index, t('detail.attachmentImageLabel', { index: index + 1 })));
  const maskItems = maskAttachments.map((item, index) => attachmentToPreviewItem(item, index, t('detail.mask')));

  return (
    <div className={styles.attachmentLayout}>
      {imageItems.length > 0 && (
        <section className={styles.attachmentGroup}>
          <span className="section-kicker">{t('detail.images')}</span>
          <AttachmentImageStrip items={imageItems} className={styles.sharedAttachmentStrip} ariaLabel={t('detail.attachments')} size="regular" />
        </section>
      )}

      {maskItems.length > 0 && (
        <section className={cx(styles.attachmentGroup, styles.maskGroup)}>
          <span className="section-kicker">{t('detail.mask')}</span>
          <AttachmentImageStrip items={maskItems} className={styles.sharedAttachmentStrip} ariaLabel={t('detail.mask')} size="regular" />
        </section>
      )}
    </div>
  );
}

function RunStatusRows({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  const expected = expectedImageCount(task);
  return (
    <div className={styles.detailGrid}>
      <DataRow label={t('detail.status')} value={t(`status.${task.status}`)} />
      <DataRow label={t('detail.images')} value={`${task.images.length} / ${expected}`} />
      <DataRow label={t('detail.updated')} value={new Date(task.updatedAt).toLocaleString()} />
      <DataRow label={t('detail.retryPolicy')} value={(task.request.params.retryAttempts ?? 0) > 0 ? t('detail.retryPolicyValue', { attempts: task.request.params.retryAttempts ?? 0, seconds: task.request.params.retryDelaySeconds ?? 0 }) : t('detail.retryPolicyOff')} />
    </div>
  );
}

function DetailRows({ rows }: { rows: DetailDataRow[] }) {
  return (
    <div className={styles.detailGrid}>
      {rows.map((row) => <DataRow key={row.id || row.label} label={row.label} value={row.value} />)}
    </div>
  );
}

function RequestMetaRows({ snapshot }: { snapshot: GenerationRequestSnapshot }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const rows = descriptor.getMetadataRows(createDetailDescriptorContext({ snapshot, t }));
  return <DetailRows rows={rows} />;
}

function SentParamsRows({ snapshot, raw }: { snapshot: GenerationRequestSnapshot; raw?: unknown }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const rows = descriptor.getParameterRows(createDetailDescriptorContext({ snapshot, raw, t }));

  if (rows.length === 0) return <p className="muted-copy">{t('detail.onlyPrompt')}</p>;

  return <DetailRows rows={rows} />;
}

function RuntimeRows({ snapshot, raw }: { snapshot: GenerationRequestSnapshot; raw?: unknown }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const rows = descriptor.getRuntimeRows?.(createDetailDescriptorContext({ snapshot, raw, t })) ?? [];
  if (rows.length === 0 || !descriptor.runtimeTitleKey) return null;
  return (
    <InspectorGroup title={t(descriptor.runtimeTitleKey)} kicker={descriptor.runtimeKickerKey ? t(descriptor.runtimeKickerKey) : undefined}>
      <DetailRows rows={rows} />
    </InspectorGroup>
  );
}

function TechnicalBlocks({ snapshot, raw, activeImage }: { snapshot: GenerationRequestSnapshot; raw?: unknown; activeImage?: GeneratedImage | null }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const blocks = descriptor.getTechnicalBlocks(createDetailDescriptorContext({ snapshot, raw, activeImage, t }));
  return (
    <div className={styles.technicalStack}>
      {blocks.map((block) => <TechnicalDetails key={block.id} title={block.title} value={block.value} defaultOpen={block.defaultOpen} />)}
    </div>
  );
}

function visible(activeMobileTab: DetailInspectorTab | undefined, tab: DetailInspectorTab) {
  return !activeMobileTab || activeMobileTab === tab;
}

function SingleSnapshotSections({ task, activeImage, activeMobileTab }: { task: GenerationTask; activeImage: GeneratedImage | null; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  const snapshot = task.request;

  return (
    <div className={styles.inspectorStack} data-detail-slot="request-single">
      {visible(activeMobileTab, 'prompt') && (
        <InspectorGroup title={t('detail.prompt')} kicker={t('detail.intent')}>
          <p className={styles.promptText}>{snapshot.prompt || t('detail.noPrompt')}</p>
          {snapshot.warnings.length > 0 && (
            <div className="warning-strip compact">{snapshot.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          )}
        </InspectorGroup>
      )}

      {visible(activeMobileTab, 'files') && (
        <InspectorGroup title={t('detail.attachments')} kicker={t('detail.files')}>
          <AttachmentsSection attachments={snapshot.attachments} />
        </InspectorGroup>
      )}

      {visible(activeMobileTab, 'params') && (
        <>
          <InspectorGroup title={t('detail.runStatus')} kicker={t('detail.result')}>
            <RunStatusRows task={task} />
            {task.error && <div className="error-strip compact">{task.error}</div>}
          </InspectorGroup>
          <InspectorGroup title={t(getProviderDetailDescriptor(snapshot).parameterTitleKey)} kicker={t(getProviderDetailDescriptor(snapshot).parameterKickerKey)}>
            <SentParamsRows snapshot={snapshot} raw={task.raw} />
          </InspectorGroup>
          <RuntimeRows snapshot={snapshot} raw={task.raw} />
          <InspectorGroup title={t(getProviderDetailDescriptor(snapshot).metadataTitleKey)} kicker={t(getProviderDetailDescriptor(snapshot).metadataKickerKey)}>
            <RequestMetaRows snapshot={snapshot} />
          </InspectorGroup>
        </>
      )}

      {visible(activeMobileTab, 'technical') && (
        <InspectorGroup title={t('detail.technical')} kicker={t('detail.developerData')}>
          <TechnicalBlocks snapshot={snapshot} raw={task.raw} activeImage={activeImage} />
        </InspectorGroup>
      )}
    </div>
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

function canCancelBatchItem(item: BatchGenerationItem): boolean {
  return cancellableBatchItemStatuses.has(item.status);
}

function BatchRequestCard({
  item,
  activeMobileTab,
  cancelling,
  onCancel
}: {
  item: BatchGenerationItem;
  activeMobileTab?: DetailInspectorTab;
  cancelling: boolean;
  onCancel: (itemId: string) => void;
}) {
  const { t } = useI18n();
  const showPrompt = visible(activeMobileTab, 'prompt');
  const showFiles = visible(activeMobileTab, 'files');
  const showParams = visible(activeMobileTab, 'params');
  const showTechnical = visible(activeMobileTab, 'technical');
  const canCancel = canCancelBatchItem(item);

  return (
    <details className={styles.batchRequestCard} open>
      <summary>
        <span>{t('detail.batchRequestTitle', { index: item.index + 1 })}</span>
        <span className={styles.batchRequestSummaryActions}>
          <span className={`status-pill tiny ${item.status}`}>{t(`status.${item.status}`)}</span>
          {canCancel && (
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
          )}
        </span>
      </summary>
      <div className={styles.batchRequestBody}>
        {showPrompt && (
          <BatchRequestSection title={t('detail.prompt')}>
            <p className={styles.promptText}>{item.request.prompt || t('detail.noPrompt')}</p>
            {item.request.warnings.length > 0 && <div className="warning-strip compact">{item.request.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
            {item.error && <div className="error-strip compact">{item.error}</div>}
          </BatchRequestSection>
        )}

        {showFiles && (
          <BatchRequestSection title={t('detail.attachments')}>
            <AttachmentsSection attachments={item.request.attachments} />
          </BatchRequestSection>
        )}

        {showParams && (
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
        )}

        {showTechnical && (
          <BatchRequestSection title={t('detail.technical')}>
            <TechnicalBlocks snapshot={item.request} raw={item.raw} />
          </BatchRequestSection>
        )}
      </div>
    </details>
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
      .finally(() => {
        setCancellingItemIds((current) => {
          const next = new Set(current);
          next.delete(itemId);
          return next;
        });
      });
  };

  return (
    <div className={styles.inspectorStack} data-detail-slot="request-batch">
      {visible(activeMobileTab, 'params') && (
        <InspectorGroup title={t('detail.runStatus')} kicker={t('detail.result')}>
          <RunStatusRows task={task} />
          <div className={styles.detailGrid}>
            <DataRow label={t('detail.batchRequests')} value={task.batch.items.length} />
            <DataRow label={t('detail.batchInterval')} value={`${task.batch.intervalMs / 1000}s`} />
          </div>
        </InspectorGroup>
      )}

      {visible(activeMobileTab, 'technical') && (
        <InspectorGroup title={t('detail.technical')} kicker={t('detail.developerData')}>
          <div className={styles.technicalStack}>
            <TechnicalDetails title={t('detail.payloadJson')} value={task.request.payload} />
            <TechnicalDetails title={t('detail.responsePayload')} value={task.raw} />
          </div>
        </InspectorGroup>
      )}

      <InspectorGroup title={t('detail.batchGeneratedImage')} kicker={t('detail.batchRequests')}>
        <div className={styles.batchList}>
          {task.batch.items.map((item) => (
            <BatchRequestCard
              key={item.id}
              item={item}
              activeMobileTab={activeMobileTab}
              cancelling={cancellingItemIds.has(item.id)}
              onCancel={cancelBatchItem}
            />
          ))}
        </div>
      </InspectorGroup>
    </div>
  );
}

export function SnapshotSections({ task, activeImage, activeMobileTab }: { task: GenerationTask; activeImage: GeneratedImage | null; activeMobileTab?: DetailInspectorTab }) {
  if (task.batch) return <BatchSnapshotSections task={task} activeMobileTab={activeMobileTab} />;
  return <SingleSnapshotSections task={task} activeImage={activeImage} activeMobileTab={activeMobileTab} />;
}
