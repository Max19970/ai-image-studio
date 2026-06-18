import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../../../domain/generationTask';
import { useI18n } from '../../../../i18n';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import { cx, expectedImageCount } from '../../model/detailHelpers';
import { sentParameters } from '../../sentParameters';
import styles from './DetailSnapshotSections.module.css';

function DataRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value === '' || value === null || value === undefined ? t('detail.omit') : String(value)}</strong>
    </div>
  );
}

function attachmentToPreviewItem(attachment: AttachmentSummary, index: number, referenceLabel: string): AttachmentPreviewItem {
  return {
    id: `${attachment.role}-${attachment.name}-${index}`,
    role: attachment.role,
    label: attachment.role === 'reference' ? referenceLabel : attachment.role,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    previewUrl: attachment.previewUrl
  };
}

function AttachmentsSection({ attachments }: { attachments: AttachmentSummary[] }) {
  const { t } = useI18n();
  const target = attachments.find((item) => item.role === 'target') ?? null;
  const refs = attachments.filter((item) => item.role === 'reference');
  const mask = attachments.find((item) => item.role === 'mask') ?? null;

  if (attachments.length === 0) {
    return <p className="muted-copy">{t('detail.noAttachments')}</p>;
  }

  const targetItems = target ? [attachmentToPreviewItem(target, 0, t('composer.role.ref', { index: 1 }))] : [];
  const refItems = refs.map((item, index) => attachmentToPreviewItem(item, index, t('composer.role.ref', { index: index + 1 })));
  const maskItems = mask ? [attachmentToPreviewItem(mask, refs.length, t('composer.role.ref', { index: refs.length + 1 }))] : [];

  return (
    <div className={cx(styles.attachmentLayout, styles.sharedPattern)}>
      {targetItems.length > 0 && (
        <section className={cx(styles.attachmentGroup, styles.targetGroup)}>
          <span className="section-kicker">{t('detail.editTarget')}</span>
          <AttachmentImageStrip items={targetItems} className={cx(styles.sharedAttachmentStrip, styles.targetOnly)} chipClassName={styles.targetAttachmentChip} ariaLabel={t('detail.editTargetAria')} size="regular" />
        </section>
      )}

      {(refItems.length > 0 || maskItems.length > 0) && (
        <section className={styles.attachmentGroup}>
          <span className="section-kicker">{t('detail.refsAndMask')}</span>
          <AttachmentImageStrip items={[...refItems, ...maskItems]} className={styles.sharedAttachmentStrip} ariaLabel={t('detail.refsAndMaskAria')} size="regular" />
        </section>
      )}
    </div>
  );
}

function SectionHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className={styles.columnHeading}>
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function RequestMetaSections({ snapshot, task, activeImage }: { snapshot: GenerationRequestSnapshot; task: GenerationTask; activeImage: GeneratedImage | null }) {
  const { t } = useI18n();
  return (
    <>
      <details className={cx(styles.detailCard, styles.resultSection, styles.metaSection)} open>
        <summary>{t('detail.meta')}</summary>
        <div className={styles.detailGrid}>
          <DataRow label={t('detail.mode')} value={t(`gallery.mode.${snapshot.mode}`)} />
          <DataRow label={t('detail.model')} value={snapshot.modelLabel || snapshot.model || t('detail.notSet')} />
          <DataRow label={t('detail.modelId')} value={snapshot.model || t('detail.notSet')} />
          <DataRow label={t('detail.endpoint')} value={snapshot.endpoint || t('detail.notSet')} />
          <DataRow label={t('detail.provider')} value={snapshot.providerLabel || t('detail.notSet')} />
          <DataRow label={t('detail.created')} value={new Date(snapshot.createdAt).toLocaleString()} />
        </div>
      </details>

      <details className={cx(styles.detailCard, styles.resultSection, styles.payloadSection, 'code-detail')} open>
        <summary>{t('detail.payloadJson')}</summary>
        <pre className="code-panel mt-4 max-h-[420px]">{JSON.stringify(snapshot.payload, null, 2)}</pre>
      </details>

      {task.raw !== undefined && task.raw !== null && (
        <details className={cx(styles.detailCard, styles.resultSection, styles.payloadSection, 'code-detail')}>
          <summary>{t('detail.responsePayload')}</summary>
          <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(task.raw, null, 2)}</pre>
        </details>
      )}

      {activeImage?.raw !== undefined && (
        <details className={cx(styles.detailCard, styles.resultSection, styles.payloadSection, 'code-detail')}>
          <summary>{t('detail.imageRaw')}</summary>
          <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(activeImage.raw, null, 2)}</pre>
        </details>
      )}
    </>
  );
}

function RunStatusCard({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  const expected = expectedImageCount(task);
  return (
    <aside className={cx(styles.statusCard, 'glass-panel')}>
      <span className="section-kicker">{t('detail.runStatus')}</span>
      <div className={styles.statusGrid}>
        <DataRow label={t('detail.status')} value={t(`status.${task.status}`)} />
        <DataRow label={t('detail.images')} value={`${task.images.length} / ${expected}`} />
        <DataRow label={t('detail.updated')} value={new Date(task.updatedAt).toLocaleString()} />
        <DataRow label={t('detail.retryPolicy')} value={task.request.params.retryAttempts > 0 ? t('detail.retryPolicyValue', { attempts: task.request.params.retryAttempts, seconds: task.request.params.retryDelaySeconds }) : t('detail.retryPolicyOff')} />
      </div>
      {task.error && <div className="error-strip compact mt-4">{task.error}</div>}
    </aside>
  );
}

function BatchIntentCard({ item }: { item: BatchGenerationItem }) {
  const { t } = useI18n();
  return (
    <details className={cx(styles.detailCard, styles.resultSection, styles.batchDetailCard)} open>
      <summary>{t('detail.batchRequestTitle', { index: item.index + 1 })} · {t(`status.${item.status}`)}</summary>
      <div className={styles.batchDetailCopy}>
        <span className="section-kicker">{t(`gallery.mode.${item.request.mode}`)}</span>
        <p>{item.request.prompt || t('detail.noPrompt')}</p>
      </div>
      <AttachmentsSection attachments={item.request.attachments} />
      {item.request.warnings.length > 0 && (
        <div className="warning-strip compact mt-4">{item.request.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
      )}
      {item.error && <div className="error-strip compact mt-4">{item.error}</div>}
    </details>
  );
}

function BatchTechnicalCard({ item }: { item: BatchGenerationItem }) {
  const { t } = useI18n();
  const sent = sentParameters(item.request, t);
  return (
    <details className={cx(styles.detailCard, styles.resultSection, styles.batchDetailCard)} open>
      <summary>{t('detail.batchRequestTitle', { index: item.index + 1 })} · {t(`status.${item.status}`)}</summary>
      <div className={cx(styles.detailGrid, styles.compactParamGrid, 'mb-4')}>
        <DataRow label={t('detail.images')} value={item.images.length} />
        <DataRow label={t('detail.mode')} value={t(`gallery.mode.${item.request.mode}`)} />
        <DataRow label={t('detail.model')} value={item.request.modelLabel || item.request.model || t('detail.notSet')} />
        <DataRow label={t('detail.endpoint')} value={item.request.endpoint || t('detail.notSet')} />
      </div>

      {sent.length === 0 ? (
        <p className="muted-copy">{t('detail.onlyPrompt')}</p>
      ) : (
        <div className={cx(styles.detailGrid, styles.compactParamGrid, 'mb-4')}>
          {sent.map((param, index) => <DataRow key={`${param.label}-${index}`} label={param.label} value={param.value} />)}
        </div>
      )}

      <details className={cx('code-detail', styles.batchInnerCode)}>
        <summary>{t('detail.payloadJson')}</summary>
        <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(item.request.payload, null, 2)}</pre>
      </details>

      {item.raw !== undefined && item.raw !== null && (
        <details className={cx('code-detail', styles.batchInnerCode)}>
          <summary>{t('detail.responsePayload')}</summary>
          <pre className="code-panel mt-4 max-h-[280px]">{JSON.stringify(item.raw, null, 2)}</pre>
        </details>
      )}
    </details>
  );
}

function SingleSnapshotSections({ task, activeImage }: { task: GenerationTask; activeImage: GeneratedImage | null }) {
  const { t } = useI18n();
  const snapshot = task.request;
  const sent = sentParameters(snapshot, t);

  return (
    <div className={styles.compositionGrid} data-detail-slot="request-single">
      <section className={cx(styles.column, styles.columnLeft)} aria-label={t('detail.leftColumnTitle')}>
        <SectionHeading number="01" title={t('detail.leftColumnTitle')} text={t('detail.leftColumnText')} />

        <details className={cx(styles.detailCard, styles.resultSection, styles.promptCard)} open>
          <summary>{t('detail.prompt')}</summary>
          <p>{snapshot.prompt || t('detail.noPrompt')}</p>
        </details>

        <details className={cx(styles.detailCard, styles.resultSection, styles.attachmentCard)} open>
          <summary>{t('detail.attachments')}</summary>
          <AttachmentsSection attachments={snapshot.attachments} />
        </details>

        {snapshot.warnings.length > 0 && (
          <details className={cx(styles.detailCard, styles.resultSection, styles.warningsSection)} open>
            <summary>{t('detail.warnings')}</summary>
            <div className="warning-strip compact">{snapshot.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          </details>
        )}
      </section>

      <div className={styles.centerSpine} aria-hidden="true">
        <span />
      </div>

      <section className={cx(styles.column, styles.columnRight)} aria-label={t('detail.rightColumnTitle')}>
        <SectionHeading number="02" title={t('detail.rightColumnTitle')} text={t('detail.rightColumnText')} />

        <RunStatusCard task={task} />

        <details className={cx(styles.detailCard, styles.resultSection, styles.paramsSection)} open>
          <summary>{t('detail.sentParams')}</summary>
          {sent.length === 0 ? (
            <p className="muted-copy">{t('detail.onlyPrompt')}</p>
          ) : (
            <div className={cx(styles.detailGrid, styles.compactParamGrid)}>
              {sent.map((param) => <DataRow key={param.label} label={param.label} value={param.value} />)}
            </div>
          )}
        </details>

        <RequestMetaSections snapshot={snapshot} task={task} activeImage={activeImage} />
      </section>
    </div>
  );
}

function BatchSnapshotSections({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  if (!task.batch) return null;

  return (
    <div className={cx(styles.compositionGrid, styles.batchCompositionGrid)} data-detail-slot="request-batch">
      <section className={cx(styles.column, styles.columnLeft)} aria-label={t('detail.leftColumnTitle')}>
        <SectionHeading number="01" title={t('detail.leftColumnTitle')} text={t('detail.batchLeftColumnText')} />
        {task.batch.items.map((item) => <BatchIntentCard key={item.id} item={item} />)}
      </section>

      <div className={styles.centerSpine} aria-hidden="true">
        <span />
      </div>

      <section className={cx(styles.column, styles.columnRight)} aria-label={t('detail.rightColumnTitle')}>
        <SectionHeading number="02" title={t('detail.rightColumnTitle')} text={t('detail.batchRightColumnText')} />
        <RunStatusCard task={task} />
        <details className={cx(styles.detailCard, styles.resultSection, styles.metaSection)} open>
          <summary>{t('detail.batchMeta')}</summary>
          <div className={styles.detailGrid}>
            <DataRow label={t('detail.batchRequests')} value={task.batch.items.length} />
            <DataRow label={t('detail.batchInterval')} value={`${task.batch.intervalMs / 1000}s`} />
            <DataRow label={t('detail.created')} value={new Date(task.createdAt).toLocaleString()} />
            <DataRow label={t('detail.updated')} value={new Date(task.updatedAt).toLocaleString()} />
            <DataRow label={t('detail.retryPolicy')} value={task.request.params.retryAttempts > 0 ? t('detail.retryPolicyValue', { attempts: task.request.params.retryAttempts, seconds: task.request.params.retryDelaySeconds }) : t('detail.retryPolicyOff')} />
          </div>
        </details>
        {task.batch.items.map((item) => <BatchTechnicalCard key={item.id} item={item} />)}
      </section>
    </div>
  );
}

export function SnapshotSections({ task, activeImage }: { task: GenerationTask; activeImage: GeneratedImage | null }) {
  if (task.batch) return <BatchSnapshotSections task={task} />;
  return <SingleSnapshotSections task={task} activeImage={activeImage} />;
}
