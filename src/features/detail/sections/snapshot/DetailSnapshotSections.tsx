import type { ReactNode } from 'react';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../../../domain/generationTask';
import { useI18n } from '../../../../i18n';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import { cx, expectedImageCount } from '../../model/detailHelpers';
import { sentParameters } from '../../sentParameters';
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
      <DataRow label={t('detail.retryPolicy')} value={task.request.params.retryAttempts > 0 ? t('detail.retryPolicyValue', { attempts: task.request.params.retryAttempts, seconds: task.request.params.retryDelaySeconds }) : t('detail.retryPolicyOff')} />
    </div>
  );
}

function RequestMetaRows({ snapshot }: { snapshot: GenerationRequestSnapshot }) {
  const { t } = useI18n();
  return (
    <div className={styles.detailGrid}>
      <DataRow label={t('detail.mode')} value={t(`gallery.mode.${snapshot.mode}`)} />
      <DataRow label={t('detail.model')} value={snapshot.modelLabel || snapshot.model || t('detail.notSet')} />
      <DataRow label={t('detail.provider')} value={snapshot.providerLabel || t('detail.notSet')} />
      <DataRow label={t('detail.endpoint')} value={snapshot.endpoint || t('detail.notSet')} />
      <DataRow label={t('detail.created')} value={new Date(snapshot.createdAt).toLocaleString()} />
    </div>
  );
}

function SentParamsRows({ snapshot }: { snapshot: GenerationRequestSnapshot }) {
  const { t } = useI18n();
  const sent = sentParameters(snapshot, t);

  if (sent.length === 0) return <p className="muted-copy">{t('detail.onlyPrompt')}</p>;

  return (
    <div className={styles.detailGrid}>
      {sent.map((param) => <DataRow key={param.label} label={param.label} value={param.value} />)}
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
          <InspectorGroup title={t('detail.sentParams')} kicker={t('detail.parameters')}>
            <SentParamsRows snapshot={snapshot} />
          </InspectorGroup>
          <InspectorGroup title={t('detail.meta')} kicker={t('detail.request')}>
            <RequestMetaRows snapshot={snapshot} />
          </InspectorGroup>
        </>
      )}

      {visible(activeMobileTab, 'technical') && (
        <InspectorGroup title={t('detail.technical')} kicker={t('detail.developerData')}>
          <div className={styles.technicalStack}>
            <TechnicalDetails title={t('detail.payloadJson')} value={snapshot.payload} />
            <TechnicalDetails title={t('detail.responsePayload')} value={task.raw} />
            <TechnicalDetails title={t('detail.imageRaw')} value={activeImage?.raw} />
          </div>
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

function BatchRequestCard({ item, activeMobileTab }: { item: BatchGenerationItem; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  const showPrompt = visible(activeMobileTab, 'prompt');
  const showFiles = visible(activeMobileTab, 'files');
  const showParams = visible(activeMobileTab, 'params');
  const showTechnical = visible(activeMobileTab, 'technical');

  return (
    <details className={styles.batchRequestCard} open>
      <summary>
        <span>{t('detail.batchRequestTitle', { index: item.index + 1 })}</span>
        <span className={`status-pill tiny ${item.status}`}>{t(`status.${item.status}`)}</span>
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
            <SentParamsRows snapshot={item.request} />
          </BatchRequestSection>
        )}

        {showTechnical && (
          <BatchRequestSection title={t('detail.technical')}>
            <div className={styles.technicalStack}>
              <TechnicalDetails title={t('detail.payloadJson')} value={item.request.payload} />
              <TechnicalDetails title={t('detail.responsePayload')} value={item.raw} />
            </div>
          </BatchRequestSection>
        )}
      </div>
    </details>
  );
}

function BatchSnapshotSections({ task, activeMobileTab }: { task: GenerationTask; activeMobileTab?: DetailInspectorTab }) {
  const { t } = useI18n();
  if (!task.batch) return null;

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
          {task.batch.items.map((item) => <BatchRequestCard key={item.id} item={item} activeMobileTab={activeMobileTab} />)}
        </div>
      </InspectorGroup>
    </div>
  );
}

export function SnapshotSections({ task, activeImage, activeMobileTab }: { task: GenerationTask; activeImage: GeneratedImage | null; activeMobileTab?: DetailInspectorTab }) {
  if (task.batch) return <BatchSnapshotSections task={task} activeMobileTab={activeMobileTab} />;
  return <SingleSnapshotSections task={task} activeImage={activeImage} activeMobileTab={activeMobileTab} />;
}
