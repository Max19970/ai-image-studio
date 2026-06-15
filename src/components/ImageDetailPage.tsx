import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../domain/types';
import { useI18n } from '../i18n';
import { useOptimizedImageSrc } from '../infrastructure/imageOptimization';
import { AttachmentImageStrip } from './AttachmentImageStrip';
import type { AttachmentPreviewItem } from './AttachmentImageStrip';

interface Props {
  task: GenerationTask;
  image?: GeneratedImage | null;
  onBack: () => void;
  onSelectImage?: (image: GeneratedImage) => void;
  onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void;
}

type CarouselSlide = { type: 'image'; image: GeneratedImage } | { type: 'pending'; id: string };

function extension(format: string) {
  if (format === 'jpeg') return 'jpg';
  if (format === 'url') return 'png';
  return format;
}

function useStatusLabel(status: GenerationTask['status']) {
  const { t } = useI18n();
  if (status === 'queued') return t('status.queued');
  if (status === 'streaming') return t('status.streaming');
  if (status === 'failed') return t('status.failed');
  return t('status.succeeded');
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value);
}

function DataRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value === '' || value === null || value === undefined ? t('detail.omit') : String(value)}</strong>
    </div>
  );
}

function stringifyParam(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function sentParameters(snapshot: GenerationRequestSnapshot, t: (key: string) => string) {
  const labelMap: Record<string, string> = {
    model: t('detail.param.model'),
    n: t('detail.param.n'),
    size: t('detail.param.size'),
    quality: t('detail.param.quality'),
    background: t('detail.param.background'),
    moderation: t('detail.param.moderation'),
    output_format: t('detail.param.format'),
    output_compression: t('detail.param.compression'),
    stream: t('detail.param.stream'),
    partial_images: t('detail.param.partialImages'),
    response_format: t('detail.param.responseFormat'),
    input_fidelity: t('detail.param.inputFidelity'),
    user: t('detail.param.user'),
    style: t('detail.param.style')
  };

  return Object.entries(snapshot.payload)
    .filter(([key]) => key !== 'prompt')
    .map(([key, value]) => ({ label: labelMap[key] ?? key, value: stringifyParam(value) }));
}

function expectedImageCount(task: GenerationTask): number {
  if (task.batch) {
    return task.batch.items.reduce((sum, item) => sum + Math.max(1, Number(item.request.payload.n ?? item.request.params.n ?? 1)), 0);
  }
  return Math.max(1, Number(task.request.payload.n ?? task.request.params.n ?? 1));
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
    <div className="detail-attachments-layout shared-pattern">
      {targetItems.length > 0 && (
        <section className="detail-attachment-group target-group">
          <span className="section-kicker">{t('detail.editTarget')}</span>
          <AttachmentImageStrip items={targetItems} className="detail-shared-attachment-strip target-only" ariaLabel={t('detail.editTargetAria')} size="regular" />
        </section>
      )}

      {(refItems.length > 0 || maskItems.length > 0) && (
        <section className="detail-attachment-group">
          <span className="section-kicker">{t('detail.refsAndMask')}</span>
          <AttachmentImageStrip items={[...refItems, ...maskItems]} className="detail-shared-attachment-strip" ariaLabel={t('detail.refsAndMaskAria')} size="regular" />
        </section>
      )}
    </div>
  );
}

function SectionHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="result-column-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SingleSnapshotSections({ task, activeImage }: { task: GenerationTask; activeImage: GeneratedImage | null }) {
  const { t } = useI18n();
  const snapshot = task.request;
  const sent = sentParameters(snapshot, t);

  return (
    <div className="result-composition-grid">
      <section className="result-column result-column-left" aria-label={t('detail.leftColumnTitle')}>
        <SectionHeading number="01" title={t('detail.leftColumnTitle')} text={t('detail.leftColumnText')} />

        <details className="detail-card result-section result-section-prompt result-prompt-card" open>
          <summary>{t('detail.prompt')}</summary>
          <p>{snapshot.prompt || t('detail.noPrompt')}</p>
        </details>

        <details className="detail-card result-section result-section-attachments result-attachment-card" open>
          <summary>{t('detail.attachments')}</summary>
          <AttachmentsSection attachments={snapshot.attachments} />
        </details>

        {snapshot.warnings.length > 0 && (
          <details className="detail-card result-section result-section-warnings" open>
            <summary>{t('detail.warnings')}</summary>
            <div className="warning-strip compact">{snapshot.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
          </details>
        )}
      </section>

      <div className="result-center-spine" aria-hidden="true">
        <span />
      </div>

      <section className="result-column result-column-right" aria-label={t('detail.rightColumnTitle')}>
        <SectionHeading number="02" title={t('detail.rightColumnTitle')} text={t('detail.rightColumnText')} />

        <RunStatusCard task={task} />

        <details className="detail-card result-section result-section-params" open>
          <summary>{t('detail.sentParams')}</summary>
          {sent.length === 0 ? (
            <p className="muted-copy">{t('detail.onlyPrompt')}</p>
          ) : (
            <div className="detail-grid compact-param-grid">
              {sent.map((param) => <DataRow key={param.label} label={param.label} value={param.value} />)}
            </div>
          )}
        </details>

        <RequestMetaSections snapshot={snapshot} task={task} activeImage={activeImage} />
      </section>
    </div>
  );
}

function BatchIntentCard({ item }: { item: BatchGenerationItem }) {
  const { t } = useI18n();
  return (
    <details className="detail-card result-section batch-detail-card" open>
      <summary>{t('detail.batchRequestTitle', { index: item.index + 1 })} · {t(`status.${item.status}`)}</summary>
      <div className="batch-detail-copy">
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
    <details className="detail-card result-section batch-detail-card" open>
      <summary>{t('detail.batchRequestTitle', { index: item.index + 1 })} · {t(`status.${item.status}`)}</summary>
      <div className="detail-grid compact-param-grid mb-4">
        <DataRow label={t('detail.images')} value={item.images.length} />
        <DataRow label={t('detail.mode')} value={t(`gallery.mode.${item.request.mode}`)} />
        <DataRow label={t('detail.model')} value={item.request.modelLabel || item.request.model || t('detail.notSet')} />
        <DataRow label={t('detail.endpoint')} value={item.request.endpoint || t('detail.notSet')} />
      </div>

      {sent.length === 0 ? (
        <p className="muted-copy">{t('detail.onlyPrompt')}</p>
      ) : (
        <div className="detail-grid compact-param-grid mb-4">
          {sent.map((param, index) => <DataRow key={`${param.label}-${index}`} label={param.label} value={param.value} />)}
        </div>
      )}

      <details className="code-detail batch-inner-code">
        <summary>{t('detail.payloadJson')}</summary>
        <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(item.request.payload, null, 2)}</pre>
      </details>

      {item.raw !== undefined && item.raw !== null && (
        <details className="code-detail batch-inner-code">
          <summary>{t('detail.responsePayload')}</summary>
          <pre className="code-panel mt-4 max-h-[280px]">{JSON.stringify(item.raw, null, 2)}</pre>
        </details>
      )}
    </details>
  );
}

function BatchSnapshotSections({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  if (!task.batch) return null;

  return (
    <div className="result-composition-grid batch-composition-grid">
      <section className="result-column result-column-left" aria-label={t('detail.leftColumnTitle')}>
        <SectionHeading number="01" title={t('detail.leftColumnTitle')} text={t('detail.batchLeftColumnText')} />
        {task.batch.items.map((item) => <BatchIntentCard key={item.id} item={item} />)}
      </section>

      <div className="result-center-spine" aria-hidden="true">
        <span />
      </div>

      <section className="result-column result-column-right" aria-label={t('detail.rightColumnTitle')}>
        <SectionHeading number="02" title={t('detail.rightColumnTitle')} text={t('detail.batchRightColumnText')} />
        <RunStatusCard task={task} />
        <details className="detail-card result-section result-section-meta" open>
          <summary>{t('detail.batchMeta')}</summary>
          <div className="detail-grid">
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

function SnapshotSections({ task, activeImage }: { task: GenerationTask; activeImage: GeneratedImage | null }) {
  if (task.batch) return <BatchSnapshotSections task={task} />;
  return <SingleSnapshotSections task={task} activeImage={activeImage} />;
}

function RequestMetaSections({ snapshot, task, activeImage }: { snapshot: GenerationRequestSnapshot; task: GenerationTask; activeImage: GeneratedImage | null }) {
  const { t } = useI18n();
  return (
    <>
      <details className="detail-card result-section result-section-meta" open>
        <summary>{t('detail.meta')}</summary>
        <div className="detail-grid">
          <DataRow label={t('detail.mode')} value={t(`gallery.mode.${snapshot.mode}`)} />
          <DataRow label={t('detail.model')} value={snapshot.modelLabel || snapshot.model || t('detail.notSet')} />
          <DataRow label={t('detail.modelId')} value={snapshot.model || t('detail.notSet')} />
          <DataRow label={t('detail.endpoint')} value={snapshot.endpoint || t('detail.notSet')} />
          <DataRow label={t('detail.provider')} value={snapshot.providerLabel || t('detail.notSet')} />
          <DataRow label={t('detail.created')} value={new Date(snapshot.createdAt).toLocaleString()} />
        </div>
      </details>

      <details className="detail-card result-section result-section-payload code-detail" open>
        <summary>{t('detail.payloadJson')}</summary>
        <pre className="code-panel mt-4 max-h-[420px]">{JSON.stringify(snapshot.payload, null, 2)}</pre>
      </details>

      {task.raw !== undefined && task.raw !== null && (
        <details className="detail-card result-section result-section-payload code-detail">
          <summary>{t('detail.responsePayload')}</summary>
          <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(task.raw, null, 2)}</pre>
        </details>
      )}

      {activeImage?.raw !== undefined && (
        <details className="detail-card result-section result-section-payload code-detail">
          <summary>{t('detail.imageRaw')}</summary>
          <pre className="code-panel mt-4 max-h-[320px]">{JSON.stringify(activeImage.raw, null, 2)}</pre>
        </details>
      )}
    </>
  );
}

function ResultActions({ activeImage, snapshot, onRestoreRequest }: { activeImage: GeneratedImage | null; snapshot: GenerationRequestSnapshot; onRestoreRequest?: (snapshot: GenerationRequestSnapshot) => void }) {
  const { t } = useI18n();
  const isBatchSnapshot = snapshot.endpoint === 'multi';
  return (
    <div className="result-action-bar">
      {activeImage && <a className="btn-primary" href={activeImage.src} download={`gpt-image-result-${activeImage.index}.${extension(activeImage.format)}`}>{t('detail.download')}</a>}
      <button type="button" className="btn-secondary" onClick={() => copyText(snapshot.prompt)}>{t('detail.copyPrompt')}</button>
      <button type="button" className="btn-secondary" onClick={() => copyText(JSON.stringify(snapshot.payload, null, 2))}>{isBatchSnapshot ? t('detail.copyBatchPayload') : t('detail.copyPayload')}</button>
      {!isBatchSnapshot && <button type="button" className="btn-secondary" onClick={() => copyText(JSON.stringify(sentParameters(snapshot, t), null, 2))}>{t('detail.copyParams')}</button>}
      {!isBatchSnapshot && <button type="button" className="btn-secondary accent-action" onClick={() => onRestoreRequest?.(snapshot)}>{t('detail.loadComposer')}</button>}
    </div>
  );
}

function RunStatusCard({ task }: { task: GenerationTask }) {
  const { t } = useI18n();
  const expected = expectedImageCount(task);
  return (
    <aside className="result-status-card glass-panel">
      <span className="section-kicker">{t('detail.runStatus')}</span>
      <div className="result-status-grid">
        <DataRow label={t('detail.status')} value={t(`status.${task.status}`)} />
        <DataRow label={t('detail.images')} value={`${task.images.length} / ${expected}`} />
        <DataRow label={t('detail.updated')} value={new Date(task.updatedAt).toLocaleString()} />
        <DataRow label={t('detail.retryPolicy')} value={task.request.params.retryAttempts > 0 ? t('detail.retryPolicyValue', { attempts: task.request.params.retryAttempts, seconds: task.request.params.retryDelaySeconds }) : t('detail.retryPolicyOff')} />
      </div>
      {task.error && <div className="error-strip compact mt-4">{task.error}</div>}
    </aside>
  );
}

function DetailThumb({ item, active, onClick }: { item: GeneratedImage; active: boolean; onClick: () => void }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(item.src, 180);
  return (
    <button type="button" className={`detail-thumb ${active ? 'active' : ''}`} onClick={onClick}>
      <img src={thumbnailSrc} alt={t('detail.outputAlt', { index: item.index + 1 })} loading="lazy" decoding="async" />
    </button>
  );
}

function ResultCarouselSlide({ slide, className, onClick }: { slide: CarouselSlide; className: string; onClick: () => void }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(slide.type === 'image' ? slide.image.src : '', 1200);

  return (
    <button type="button" className={`result-carousel-slide ${className}`} onClick={onClick}>
      {slide.type === 'image' ? (
        <img src={thumbnailSrc} alt={t('detail.generatedAlt', { index: slide.image.index + 1 })} loading="eager" decoding="async" />
      ) : (
        <div className="detail-placeholder-state carousel-pending-state">
          <div className="gallery-spinner" aria-hidden="true" />
          <strong>{t('detail.generatingNext')}</strong>
          <p>{t('detail.processingFallback')}</p>
        </div>
      )}
    </button>
  );
}

function ResultCarousel({
  task,
  initialImage,
  label,
  onSelectImage
}: {
  task: GenerationTask;
  initialImage: GeneratedImage | null;
  label: string;
  onSelectImage?: (image: GeneratedImage) => void;
}) {
  const { t } = useI18n();
  const expected = expectedImageCount(task);
  const shouldShowPending = task.status !== 'succeeded' && task.status !== 'failed' && task.images.length < expected;
  const slides = useMemo<CarouselSlide[]>(() => {
    const imageSlides: CarouselSlide[] = task.images.map((item) => ({ type: 'image', image: item }));
    if (shouldShowPending) imageSlides.push({ type: 'pending', id: 'pending' });
    return imageSlides.length > 0 ? imageSlides : [{ type: 'pending', id: 'pending' }];
  }, [task.images, shouldShowPending]);

  const findInitialIndex = () => {
    if (!initialImage) return 0;
    const next = slides.findIndex((slide) => slide.type === 'image' && slide.image.id === initialImage.id);
    return next >= 0 ? next : 0;
  };

  const [activeIndex, setActiveIndex] = useState(findInitialIndex);
  const lastSyncedInitialIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const initialId = initialImage?.id ?? null;
    if (lastSyncedInitialIdRef.current === initialId) return;
    lastSyncedInitialIdRef.current = initialId;
    if (!initialImage) return;
    const next = slides.findIndex((slide) => slide.type === 'image' && slide.image.id === initialImage.id);
    if (next >= 0) setActiveIndex(next);
  }, [initialImage, slides]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(Math.max(0, slides.length - 1));
  }, [activeIndex, slides.length]);

  const selectIndex = (index: number, notify = true) => {
    const nextIndex = (index + slides.length) % slides.length;
    setActiveIndex(nextIndex);
    const selected = slides[nextIndex];
    if (notify && selected?.type === 'image') onSelectImage?.(selected.image);
  };

  const go = (delta: number) => selectIndex(activeIndex + delta);

  const activeSlide = slides[activeIndex];
  const activeImage = activeSlide?.type === 'image' ? activeSlide.image : null;

  const slideClass = (index: number) => {
    if (index === activeIndex) return 'active';
    if (index === (activeIndex - 1 + slides.length) % slides.length) return 'prev';
    if (index === (activeIndex + 1) % slides.length) return 'next';
    return 'hidden';
  };

  return (
    <div className="result-carousel-stage">
      <div className={`status-pill floating ${task.status}`}>{activeImage?.kind === 'partial' ? t('detail.partialImage') : label}</div>
      <div className="result-carousel-viewport" aria-label={t('detail.carouselAria')}>
        {slides.map((slide, index) => (
          <ResultCarouselSlide
            key={slide.type === 'image' ? slide.image.id : slide.id}
            slide={slide}
            className={slideClass(index)}
            onClick={() => selectIndex(index)}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className="result-carousel-nav result-carousel-nav-prev" onClick={() => go(-1)} aria-label={t('detail.prevImage')}>←</button>
          <button type="button" className="result-carousel-nav result-carousel-nav-next" onClick={() => go(1)} aria-label={t('detail.nextImage')}>→</button>
          <span className="result-carousel-counter">{activeIndex + 1} / {slides.length}</span>
        </>
      )}
    </div>
  );
}

export function ImageDetailPage({ task, image, onBack, onSelectImage, onRestoreRequest }: Props) {
  const { t } = useI18n();
  const [requestOpen, setRequestOpen] = useState(true);
  const expected = expectedImageCount(task);
  const hasPendingSlide = task.status !== 'succeeded' && task.status !== 'failed' && task.images.length < expected;
  const shouldUseCarousel = Boolean(task.batch) || task.images.length > 1 || hasPendingSlide;
  const fallbackActiveImage = image ?? task.images[0] ?? null;
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(fallbackActiveImage);
  const snapshot = task.request;
  const label = useStatusLabel(task.status);

  useEffect(() => {
    setActiveImage(image ?? task.images[0] ?? null);
  }, [image, task.images]);

  return (
    <main className="detail-page result-page result-page-composed">
      <div className="detail-shell result-shell">
        <header className="detail-topbar result-topbar">
          <button className="btn-secondary" onClick={onBack}>{t('detail.back')}</button>
          <div className="result-title-block">
            <h1>{task.batch ? t('detail.batchGeneratedImage') : activeImage ? (activeImage.kind === 'partial' ? t('detail.partialImage') : t('detail.generatedImage')) : t('detail.generationRequest')}</h1>
            <p className="muted-copy">{t('detail.statusLine', { status: label, date: new Date(task.createdAt).toLocaleString() })}</p>
          </div>
          <div className={`status-pill ${task.status}`}>{label}</div>
        </header>

        <section className="result-hero-wrap" aria-label={t('detail.imageStage')}>
          <div className="result-hero-orbit result-hero-orbit-left" aria-hidden="true">{task.batch ? t('gallery.kind.batch') : t('detail.prompt')}</div>
          <section className={`result-hero-card glass-panel result-hero-card-centered ${shouldUseCarousel ? 'has-carousel' : ''}`}>
            <div className="result-image-stage">
              {shouldUseCarousel ? (
                <ResultCarousel
                  task={task}
                  initialImage={fallbackActiveImage}
                  label={label}
                  onSelectImage={(selected) => { setActiveImage(selected); onSelectImage?.(selected); }}
                />
              ) : activeImage ? (
                <>
                  <div className={`status-pill floating ${task.status}`}>{label}</div>
                  <img src={activeImage.src} alt={t('detail.generatedAlt', { index: activeImage.index + 1 })} loading="eager" decoding="async" />
                </>
              ) : (
                <div className="detail-placeholder-state">
                  <div className="gallery-spinner" aria-hidden="true" />
                  <strong>{label}</strong>
                  <p>{task.status === 'failed' ? (task.error || t('detail.failedFallback')) : t('detail.processingFallback')}</p>
                </div>
              )}

              <button
                type="button"
                className={`result-foldout-button ${requestOpen ? 'open' : ''}`}
                onClick={() => setRequestOpen((value) => !value)}
                aria-expanded={requestOpen}
              >
                <span>{requestOpen ? t('detail.hideDetails') : t('detail.showDetails')}</span>
                <strong aria-hidden="true">⌄</strong>
              </button>
            </div>

            {task.images.length > 1 && (
              <div className="result-output-strip">
                {task.images.map((item) => (
                  <DetailThumb key={item.id} item={item} active={activeImage?.id === item.id} onClick={() => { setActiveImage(item); onSelectImage?.(item); }} />
                ))}
              </div>
            )}

            <ResultActions activeImage={activeImage} snapshot={snapshot} onRestoreRequest={onRestoreRequest} />
          </section>
          <div className="result-hero-orbit result-hero-orbit-right" aria-hidden="true">{shouldUseCarousel ? t('detail.carousel') : 'JSON'}</div>
        </section>

        <div className={`result-request-drawer ${requestOpen ? 'open' : 'closed'}`}>
          <SnapshotSections task={task} activeImage={activeImage} />
        </div>
      </div>
    </main>
  );
}
