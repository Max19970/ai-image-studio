import { useEffect, useMemo, useRef, useState } from 'react';
import type { GenerationModel, GenerationProvider, ImageParams, WorkMode } from '../domain/types';
import { useI18n } from '../i18n';
import { AttachmentImageStrip } from './AttachmentImageStrip';
import type { AttachmentPreviewItem } from './AttachmentImageStrip';
import { PopoverSelect } from './PopoverSelect';

export interface BatchComposerDraft {
  id: string;
  mode: WorkMode;
  params: ImageParams;
  selectedModelId: string;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
}

interface Props {
  drafts: BatchComposerDraft[];
  intervalSeconds: number;
  busy: boolean;
  canSubmit: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  onIntervalSecondsChange: (value: number) => void;
  onDraftChange: (id: string, patch: Partial<BatchComposerDraft>) => void;
  onDraftParamsChange: (id: string, params: ImageParams) => void;
  onAddDraft: () => void;
  onDuplicateDraft: (id: string) => void;
  onRemoveDraft: (id: string) => void;
  onOpenParameters: (id: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

type ComposerAttachment = AttachmentPreviewItem & { file: File };

function makeItem(id: string, role: ComposerAttachment['role'], label: string, file: File, previewUrl: string): ComposerAttachment {
  return {
    id,
    role,
    label,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl,
    lastModified: file.lastModified
  };
}

function DraftAttachments({ draft, onDraftChange }: { draft: BatchComposerDraft; onDraftChange: (patch: Partial<BatchComposerDraft>) => void }) {
  const { t } = useI18n();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!draft.targetImage) {
      setTargetUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.targetImage);
    setTargetUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.targetImage]);

  useEffect(() => {
    if (!draft.mask) {
      setMaskUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.mask);
    setMaskUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.mask]);

  useEffect(() => {
    const urls = draft.referenceImages.map((file) => URL.createObjectURL(file));
    setReferenceUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [draft.referenceImages]);

  const attachments = useMemo<ComposerAttachment[]>(() => {
    const items: ComposerAttachment[] = [];
    if (draft.targetImage && targetUrl) items.push(makeItem('target', 'target', t('composer.role.target'), draft.targetImage, targetUrl));
    draft.referenceImages.forEach((file, index) => {
      const url = referenceUrls[index];
      if (url) items.push(makeItem(`reference-${file.name}-${file.size}-${index}`, 'reference', t('composer.role.ref', { index: index + 1 }), file, url));
    });
    if (draft.mask && maskUrl) items.push(makeItem('mask', 'mask', t('composer.role.mask'), draft.mask, maskUrl));
    return items;
  }, [draft.targetImage, draft.referenceImages, draft.mask, targetUrl, referenceUrls, maskUrl, t]);

  const removeAttachment = (item: AttachmentPreviewItem) => {
    if (item.role === 'target') onDraftChange({ targetImage: null, mode: draft.referenceImages.length || draft.mask ? 'edit' : draft.mode });
    if (item.role === 'mask') onDraftChange({ mask: null });
    if (item.role === 'reference') {
      onDraftChange({ referenceImages: draft.referenceImages.filter((file, index) => item.id !== `reference-${file.name}-${file.size}-${index}`) });
    }
  };

  if (attachments.length === 0) return null;

  return (
    <AttachmentImageStrip
      items={attachments}
      onRemove={removeAttachment}
      className="batch-draft-attachments"
      ariaLabel={t('composer.attachmentsAria')}
      size="compact"
    />
  );
}

function DraftRow({
  draft,
  index,
  canRemove,
  models,
  providers,
  onDraftChange,
  onDraftParamsChange,
  onDuplicateDraft,
  onRemoveDraft,
  onOpenParameters
}: {
  draft: BatchComposerDraft;
  index: number;
  canRemove: boolean;
  models: GenerationModel[];
  providers: GenerationProvider[];
  onDraftChange: (id: string, patch: Partial<BatchComposerDraft>) => void;
  onDraftParamsChange: (id: string, params: ImageParams) => void;
  onDuplicateDraft: (id: string) => void;
  onRemoveDraft: (id: string) => void;
  onOpenParameters: (id: string) => void;
}) {
  const { t } = useI18n();
  const targetRef = useRef<HTMLInputElement | null>(null);
  const refsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedModel = models.find((model) => model.id === draft.selectedModelId) ?? models[0] ?? null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${Math.max(72, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 220 ? 'auto' : 'hidden';
  }, [draft.params.prompt]);

  const modelOptions = useMemo(() => models.map((model) => {
    const provider = providers.find((item) => item.id === model.providerId);
    return {
      value: model.id,
      label: model.name || model.modelId,
      description: [model.modelId, provider?.name].filter(Boolean).join(' · ')
    };
  }), [models, providers]);

  const patchDraft = (patch: Partial<BatchComposerDraft>) => onDraftChange(draft.id, patch);
  const patchParams = (patch: Partial<ImageParams>) => onDraftParamsChange(draft.id, { ...draft.params, ...patch });

  const addReferences = (files: File[]) => {
    patchDraft({ referenceImages: [...draft.referenceImages, ...files].slice(0, 15), mode: 'edit' });
  };

  const attachmentsCount = (draft.targetImage ? 1 : 0) + draft.referenceImages.length + (draft.mask ? 1 : 0);

  return (
    <article className="batch-draft-card">
      <header className="batch-draft-header">
        <div>
          <span className="section-kicker">{t('batch.requestLabel', { index: index + 1 })}</span>
          <strong>{draft.params.prompt.trim() || t('batch.emptyPrompt')}</strong>
        </div>
        <div className="batch-draft-header-actions">
          <button type="button" className="btn-secondary micro" onClick={() => onDuplicateDraft(draft.id)}>{t('batch.duplicate')}</button>
          {canRemove && <button type="button" className="btn-secondary micro danger" onClick={() => onRemoveDraft(draft.id)}>{t('batch.remove')}</button>}
        </div>
      </header>

      <div className="batch-draft-mode-row" role="group" aria-label={t('composer.modeAria')}>
        <button type="button" className={`batch-pill ${draft.mode === 'generate' ? 'active' : ''}`} onClick={() => patchDraft({ mode: 'generate' })}>{t('composer.generate')}</button>
        <button type="button" className={`batch-pill ${draft.mode === 'edit' ? 'active' : ''}`} onClick={() => patchDraft({ mode: 'edit' })}>{t('composer.edit')}</button>
        <span className="batch-attachments-counter">{t('batch.attachmentsCount', { count: attachmentsCount })}</span>
      </div>

      <div className="batch-prompt-wrap">
        <textarea
          ref={textareaRef}
          value={draft.params.prompt}
          onChange={(event) => patchParams({ prompt: event.target.value })}
          placeholder={draft.mode === 'generate' ? t('composer.placeholder.generate') : t('composer.placeholder.edit')}
        />
        {draft.params.prompt.length > 0 && (
          <button type="button" className="prompt-clear-button" onClick={() => patchParams({ prompt: '' })} aria-label={t('composer.clearPrompt')} title={t('composer.clearPrompt')}>×</button>
        )}
      </div>

      <DraftAttachments draft={draft} onDraftChange={patchDraft} />

      <div className="batch-draft-toolbar">
        <input ref={targetRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { patchDraft({ targetImage: event.target.files?.[0] ?? null, mode: 'edit' }); event.currentTarget.value = ''; }} />
        <input ref={refsRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { addReferences(Array.from(event.target.files ?? [])); event.currentTarget.value = ''; }} />
        <input ref={maskRef} type="file" accept="image/png" onChange={(event) => { patchDraft({ mask: event.target.files?.[0] ?? null, mode: 'edit' }); event.currentTarget.value = ''; }} />

        <div className="batch-model-select">
          <span>{t('composer.model')}</span>
          <PopoverSelect
            value={selectedModel?.id ?? ''}
            options={modelOptions}
            onChange={(modelId) => patchDraft({ selectedModelId: modelId })}
            ariaLabel={t('composer.model')}
            placeholder={t('detail.notSet')}
            emptyText={t('app.warningNoModel')}
            className="composer-model-popover"
            matchAnchorWidth={false}
            minWidth={300}
            triggerClassName="composer-model-trigger"
            panelClassName="composer-model-panel"
          />
        </div>

        <button type="button" className="btn-secondary micro" onClick={() => targetRef.current?.click()}>{t('composer.target')}</button>
        <button type="button" className="btn-secondary micro" onClick={() => refsRef.current?.click()}>{t('composer.refs')}</button>
        <button type="button" className="btn-secondary micro" onClick={() => maskRef.current?.click()}>{t('composer.mask')}</button>
        {attachmentsCount > 0 && <button type="button" className="btn-secondary micro danger" onClick={() => patchDraft({ targetImage: null, referenceImages: [], mask: null })}>× {t('composer.clearAttachments')}</button>}
        <button type="button" className="btn-secondary micro accent-action" onClick={() => onOpenParameters(draft.id)}>{t('composer.params')}</button>
      </div>
    </article>
  );
}

export function MultiImageComposer({
  drafts,
  intervalSeconds,
  busy,
  canSubmit,
  models,
  providers,
  onIntervalSecondsChange,
  onDraftChange,
  onDraftParamsChange,
  onAddDraft,
  onDuplicateDraft,
  onRemoveDraft,
  onOpenParameters,
  onSubmit,
  onCancel
}: Props) {
  const { t } = useI18n();
  const totalImages = drafts.reduce((sum, draft) => sum + Math.max(1, Number(draft.params.n || 1)), 0);
  const validDrafts = drafts.filter((draft) => draft.params.prompt.trim() && (draft.mode === 'generate' || draft.targetImage)).length;

  return (
    <section className="batch-composer-stage" aria-label={t('batch.aria')}>
      <div className="batch-composer-shell glass-panel">
        <header className="batch-composer-topbar">
          <div>
            <span className="section-kicker">{t('batch.kicker')}</span>
            <h2><span className="batch-title-full">{t('batch.title')}</span><span className="batch-title-mobile">{t('batch.mobileTitle')}</span></h2>
            <p>{t('batch.subtitle')}</p>
          </div>
          <button type="button" className="btn-secondary batch-close-button" onClick={onCancel}><span className="batch-action-full">{t('batch.close')}</span><span className="batch-action-mobile">{t('batch.mobileClose')}</span></button>
        </header>

        <div className="batch-composer-controls">
          <label className="batch-interval-field">
            <span><span className="batch-action-full">{t('batch.interval')}</span><span className="batch-action-mobile">{t('batch.mobileInterval')}</span></span>
            <input
              type="number"
              min={0}
              max={3600}
              step={1}
              value={intervalSeconds}
              onChange={(event) => onIntervalSecondsChange(Math.max(0, Number(event.target.value) || 0))}
            />
            <small>{t('batch.intervalHint')}</small>
          </label>
          <div className="batch-summary-card">
            <span>{t('batch.summary')}</span>
            <strong><span className="batch-action-full">{t('batch.summaryValue', { requests: drafts.length, valid: validDrafts, images: totalImages })}</span><span className="batch-action-mobile">{t('batch.mobileSummaryValue', { requests: drafts.length, valid: validDrafts, images: totalImages })}</span></strong>
          </div>
        </div>

        <div className="batch-draft-list">
          {drafts.map((draft, index) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              index={index}
              canRemove={drafts.length > 1}
              models={models}
              providers={providers}
              onDraftChange={onDraftChange}
              onDraftParamsChange={onDraftParamsChange}
              onDuplicateDraft={onDuplicateDraft}
              onRemoveDraft={onRemoveDraft}
              onOpenParameters={onOpenParameters}
            />
          ))}
        </div>

        <footer className="batch-composer-footer">
          <button type="button" className="btn-secondary batch-add-button" onClick={onAddDraft}>＋ <span>{t('batch.addRequest')}</span></button>
          <button type="button" className="btn-primary batch-submit-button" disabled={!canSubmit} onClick={onSubmit}><span className="batch-action-full">{busy ? t('batch.busy') : t('batch.submit')}</span><span className="batch-action-mobile">{busy ? t('batch.busy') : t('batch.mobileSubmit')}</span></button>
        </footer>
      </div>
    </section>
  );
}
