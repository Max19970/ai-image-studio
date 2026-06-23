import type { ReactNode } from 'react';
import type { AttachmentSummary, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../../../../domain/generationTask';
import { useI18n } from '../../../../i18n';
import { AttachmentImageStrip } from '../../../../shared/ui';
import type { AttachmentPreviewItem } from '../../../../shared/ui';
import { cx, expectedImageCount } from '../../model/detailHelpers';
import { createDetailDescriptorContext, getProviderDetailDescriptor, type DetailDataRow } from '../../model/detailDescriptors';
import styles from './DetailSnapshotSections.module.css';

export type DetailInspectorTab = 'prompt' | 'params' | 'files' | 'technical';

export function DataRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <strong>{value === '' || value === null || value === undefined ? t('detail.omit') : String(value)}</strong>
    </div>
  );
}

export function InspectorGroup({ title, kicker, children, className }: { title: string; kicker?: string; children: ReactNode; className?: string }) {
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

export function TechnicalDetails({ title, value, defaultOpen = false }: { title: string; value: unknown; defaultOpen?: boolean }) {
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

export function AttachmentsSection({ attachments }: { attachments: AttachmentSummary[] }) {
  const { t } = useI18n();
  const imageAttachments = attachments.filter((item) => item.role !== 'mask');
  const maskAttachments = attachments.filter((item) => item.role === 'mask');

  if (attachments.length === 0) return <p className="muted-copy">{t('detail.noAttachments')}</p>;

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

export function RunStatusRows({ task }: { task: GenerationTask }) {
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
  return <div className={styles.detailGrid}>{rows.map((row) => <DataRow key={row.id || row.label} label={row.label} value={row.value} />)}</div>;
}

export function RequestMetaRows({ snapshot }: { snapshot: GenerationRequestSnapshot }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  return <DetailRows rows={descriptor.getMetadataRows(createDetailDescriptorContext({ snapshot, t }))} />;
}

export function SentParamsRows({ snapshot, raw }: { snapshot: GenerationRequestSnapshot; raw?: unknown }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const rows = descriptor.getParameterRows(createDetailDescriptorContext({ snapshot, raw, t }));
  return rows.length === 0 ? <p className="muted-copy">{t('detail.onlyPrompt')}</p> : <DetailRows rows={rows} />;
}

export function RuntimeRows({ snapshot, raw }: { snapshot: GenerationRequestSnapshot; raw?: unknown }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const rows = descriptor.getRuntimeRows?.(createDetailDescriptorContext({ snapshot, raw, t })) ?? [];
  if (rows.length === 0 || !descriptor.runtimeTitleKey) return null;
  return <InspectorGroup title={t(descriptor.runtimeTitleKey)} kicker={descriptor.runtimeKickerKey ? t(descriptor.runtimeKickerKey) : undefined}><DetailRows rows={rows} /></InspectorGroup>;
}

export function TechnicalBlocks({ snapshot, raw, activeImage }: { snapshot: GenerationRequestSnapshot; raw?: unknown; activeImage?: GeneratedImage | null }) {
  const { t } = useI18n();
  const descriptor = getProviderDetailDescriptor(snapshot);
  const blocks = descriptor.getTechnicalBlocks(createDetailDescriptorContext({ snapshot, raw, activeImage, t }));
  return <div className={styles.technicalStack}>{blocks.map((block) => <TechnicalDetails key={block.id} title={block.title} value={block.value} defaultOpen={block.defaultOpen} />)}</div>;
}

export function visible(activeMobileTab: DetailInspectorTab | undefined, tab: DetailInspectorTab) {
  return !activeMobileTab || activeMobileTab === tab;
}
