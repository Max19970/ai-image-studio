import { useEffect, useState } from 'react';
import type { GeneratedImage, GenerationTask } from '../domain/types';
import { useI18n } from '../i18n';
import { useOptimizedImageSrc } from '../infrastructure/imageOptimization';

interface Props {
  tasks: GenerationTask[];
  busy: boolean;
  onClearResults: () => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTask: (task: GenerationTask, image?: GeneratedImage) => void;
}

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

function TaskPlaceholderCard({ task, onOpen, onDelete }: { task: GenerationTask; onOpen: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const label = useStatusLabel(task.status);

  return (
    <article className={`gallery-card gallery-card-status gallery-status-${task.status}`}>
      <button type="button" onClick={onOpen} aria-label={t('gallery.openDetails')}>
        <div className="gallery-card-placeholder">
          <div className="gallery-spinner" aria-hidden="true" />
          <strong>{label}</strong>
          <p>{task.status === 'failed' ? (task.error || t('gallery.requestFailed')) : t('gallery.requestSent')}</p>
        </div>
      </button>
      <button type="button" className="gallery-card-delete" onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label={t('gallery.deleteRequest')}>×</button>
      <footer>
        <div>
          <span>{task.kind === 'batch' ? t('gallery.kind.batch') : t(`gallery.mode.${task.request.mode}`)}</span>
          <strong>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
        </div>
        <span className={`status-pill ${task.status}`}>{label}</span>
      </footer>
    </article>
  );
}

function GalleryTaskCard({ task, index, onOpenTask, onDelete }: { task: GenerationTask; index: number; onOpenTask: (image?: GeneratedImage) => void; onDelete: () => void }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const label = useStatusLabel(task.status);
  const activeImage = task.images[Math.min(activeIndex, Math.max(0, task.images.length - 1))] ?? null;
  const thumbnailSrc = useOptimizedImageSrc(activeImage?.src ?? '', 560);
  const created = new Date(task.updatedAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isBatch = task.kind === 'batch';
  const hasMultiple = isBatch || task.images.length > 1;
  const modeText = isBatch
    ? t('gallery.kind.batchWithCount', { count: task.batch?.items.length ?? 0 })
    : t(`gallery.mode.${task.request.mode}`);

  useEffect(() => {
    if (task.images.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideDirection('next');
      setActiveIndex((value) => (value + 1) % task.images.length);
    }, 1700);
    return () => window.clearInterval(id);
  }, [task.images.length]);

  useEffect(() => {
    if (activeIndex >= task.images.length) setActiveIndex(Math.max(0, task.images.length - 1));
  }, [activeIndex, task.images.length]);

  return (
    <article className={`gallery-card ${hasMultiple ? 'gallery-card-sequence' : ''}`}>
      <button type="button" onClick={() => onOpenTask(activeImage ?? undefined)} aria-label={t('gallery.openImage', { index: index + 1 })}>
        {activeImage ? (
          <img key={activeImage.id} className={`gallery-slide-image ${slideDirection}`} src={thumbnailSrc} alt={t('gallery.generatedAlt', { index: activeImage.index + 1 })} loading="lazy" decoding="async" />
        ) : (
          <div className="gallery-card-placeholder">
            <div className="gallery-spinner" aria-hidden="true" />
            <strong>{label}</strong>
            <p>{task.status === 'failed' ? (task.error || t('gallery.requestFailed')) : t('gallery.requestSent')}</p>
          </div>
        )}
        <span className={`status-pill floating ${task.status}`}>{activeImage?.kind === 'partial' ? t('gallery.kind.partial') : label}</span>
        {hasMultiple && (
          <span className="gallery-sequence-badge">
            <span aria-hidden="true">↻</span>
            {t('gallery.sequenceCount', { count: task.images.length })}
          </span>
        )}
      </button>
      <button type="button" className="gallery-card-delete" onClick={(event) => { event.stopPropagation(); onDelete(); }} aria-label={t('gallery.deleteRequest')}>×</button>
      <footer>
        <div>
          <span>{modeText}{activeImage ? ` · #${activeImage.index + 1}` : ''}</span>
          <strong>{created}</strong>
        </div>
        {activeImage && <a href={activeImage.src} download={`gpt-image-result-${index + 1}.${extension(activeImage.format)}`} onClick={(event) => event.stopPropagation()}>{t('gallery.download')}</a>}
      </footer>
    </article>
  );
}

export function ResultsGallery({ tasks, busy, onClearResults, onDeleteTask, onOpenTask }: Props) {
  const { t } = useI18n();
  const hasCards = tasks.length > 0;

  return (
    <section className={`gallery-stage ${hasCards ? 'has-results' : 'is-empty'}`}>
      <header className="gallery-header gallery-header-minimal">
        <div className="gallery-header-copy">
          {hasCards && <h2>{t('gallery.title')}</h2>}
        </div>
        <div className="gallery-header-actions">
          {tasks.length > 0 && <button type="button" className="history-link clear-results-button" onClick={onClearResults}>{t('gallery.clearResults')}</button>}
          <button type="button" className="history-link">↻ {t('gallery.history')}</button>
          <div className="gallery-count">
            <strong>{tasks.length}</strong>
            <span>{busy ? t('gallery.running') : t('gallery.items')}</span>
          </div>
        </div>
      </header>

      {!hasCards ? (
        <div className="empty-gallery">
          <div className="empty-frame" />
          <p className="section-kicker centered">{t('gallery.title')}</p>
          <h3>{t('gallery.emptyTitle')}</h3>
          <p>{t('gallery.emptyText')}</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {tasks.map((task, idx) => task.images.length === 0
            ? <TaskPlaceholderCard key={task.id} task={task} onOpen={() => onOpenTask(task)} onDelete={() => onDeleteTask(task.id)} />
            : <GalleryTaskCard key={task.id} task={task} index={idx} onOpenTask={(image) => onOpenTask(task, image)} onDelete={() => onDeleteTask(task.id)} />)}
        </div>
      )}
    </section>
  );
}
