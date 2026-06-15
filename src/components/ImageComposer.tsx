import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, Ref } from 'react';
import type { GenerationModel, GenerationProvider, WorkMode } from '../domain/types';
import { useI18n } from '../i18n';
import { AttachmentImageStrip } from './AttachmentImageStrip';
import type { AttachmentPreviewItem } from './AttachmentImageStrip';
import { PopoverSelect } from './PopoverSelect';
import { FloatingPopover } from './FloatingPopover';

interface Props {
  mode: WorkMode;
  prompt: string;
  busy: boolean;
  canSubmit: boolean;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  models: GenerationModel[];
  providers: GenerationProvider[];
  selectedModelId: string;
  statusText?: string | null;
  onModeChange: (mode: WorkMode) => void;
  onModelChange: (modelId: string) => void;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  onOpenParameters: () => void;
  onOpenBatchComposer: () => void;
  onTargetImageChange: (file: File | null) => void;
  onReferenceImagesChange: (files: File[]) => void;
  onMaskChange: (file: File | null) => void;
}

type ComposerAttachment = AttachmentPreviewItem & { file: File };
type ComposerPopover = 'mode' | 'assets' | null;

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

function ActionIconButton({ icon, label, active = false, onClick, buttonRef }: { icon: string; label: string; active?: boolean; onClick: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  return (
    <button ref={buttonRef} type="button" className={`composer-icon-button ${active ? 'active' : ''}`} data-tooltip={label} aria-label={label} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

export function ImageComposer({
  mode,
  prompt,
  busy,
  canSubmit,
  targetImage,
  referenceImages,
  mask,
  models,
  providers,
  selectedModelId,
  statusText,
  onModeChange,
  onModelChange,
  onPromptChange,
  onSubmit,
  onOpenParameters,
  onOpenBatchComposer,
  onTargetImageChange,
  onReferenceImagesChange,
  onMaskChange
}: Props) {
  const { t } = useI18n();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<ComposerPopover>(null);
  const targetRef = useRef<HTMLInputElement | null>(null);
  const refsRef = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modeButtonRef = useRef<HTMLButtonElement | null>(null);
  const assetsButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;
  const selectedProvider = selectedModel ? providers.find((provider) => provider.id === selectedModel.providerId) : null;

  useEffect(() => {
    if (!targetImage) {
      setTargetUrl(null);
      return;
    }
    const url = URL.createObjectURL(targetImage);
    setTargetUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [targetImage]);

  useEffect(() => {
    if (!mask) {
      setMaskUrl(null);
      return;
    }
    const url = URL.createObjectURL(mask);
    setMaskUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mask]);

  useEffect(() => {
    const urls = referenceImages.map((file) => URL.createObjectURL(file));
    setReferenceUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [referenceImages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 240);
    textarea.style.height = `${Math.max(52, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 240 ? 'auto' : 'hidden';
  }, [prompt]);


  const attachments = useMemo<ComposerAttachment[]>(() => {
    const items: ComposerAttachment[] = [];
    if (targetImage && targetUrl) items.push(makeItem('target', 'target', t('composer.role.target'), targetImage, targetUrl));
    referenceImages.forEach((file, index) => {
      const url = referenceUrls[index];
      if (url) items.push(makeItem(`reference-${file.name}-${file.size}-${index}`, 'reference', t('composer.role.ref', { index: index + 1 }), file, url));
    });
    if (mask && maskUrl) items.push(makeItem('mask', 'mask', t('composer.role.mask'), mask, maskUrl));
    return items;
  }, [targetImage, targetUrl, referenceImages, referenceUrls, mask, maskUrl, t]);

  const modelOptions = useMemo(() => models.map((model) => {
    const provider = providers.find((item) => item.id === model.providerId);
    return {
      value: model.id,
      label: model.name || model.modelId,
      description: [model.modelId, provider?.name].filter(Boolean).join(' · ')
    };
  }), [models, providers]);

  const removeAttachment = (item: AttachmentPreviewItem) => {
    if (item.role === 'target') onTargetImageChange(null);
    if (item.role === 'mask') onMaskChange(null);
    if (item.role === 'reference') {
      onReferenceImagesChange(referenceImages.filter((file, index) => item.id !== `reference-${file.name}-${file.size}-${index}`));
    }
  };

  const clearAttachments = () => {
    onTargetImageChange(null);
    onReferenceImagesChange([]);
    onMaskChange(null);
    setOpenPopover(null);
  };

  const addReferences = (files: File[]) => {
    const merged = [...referenceImages, ...files].slice(0, 15);
    onReferenceImagesChange(merged);
  };

  const submitOnEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className="composer-dock" aria-label={t('composer.aria')}>
      {attachments.length > 0 && (
        <AttachmentImageStrip
          items={attachments}
          onRemove={removeAttachment}
          className="composer-attachment-strip"
          ariaLabel={t('composer.attachmentsAria')}
          size="regular"
        />
      )}

      <div className="composer-main">
        <div className="prompt-field-wrap">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={submitOnEnter}
            placeholder={mode === 'generate' ? t('composer.placeholder.generate') : t('composer.placeholder.edit')}
          />
          {prompt.length > 0 && (
            <button type="button" className="prompt-clear-button" onClick={() => onPromptChange('')} aria-label={t('composer.clearPrompt')} title={t('composer.clearPrompt')}>
              ×
            </button>
          )}
        </div>

        <div className="composer-actions">
          <input ref={targetRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onTargetImageChange(e.target.files?.[0] ?? null)} />
          <input ref={refsRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => addReferences(Array.from(e.target.files ?? []))} />
          <input ref={maskRef} type="file" accept="image/png" onChange={(e) => onMaskChange(e.target.files?.[0] ?? null)} />

          <div className="composer-actions-left">
            <div className="composer-model-select">
              <span>{t('composer.model')}</span>
              <PopoverSelect
                value={selectedModel?.id ?? ''}
                options={modelOptions}
                onChange={onModelChange}
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

            <div className="composer-tool-cluster">
              <div className={`composer-popover-wrap ${openPopover === 'mode' ? 'open' : ''}`}>
                <ActionIconButton
                  buttonRef={modeButtonRef}
                  icon="◐"
                  label={`${t('composer.generate')} / ${t('composer.edit')}`}
                  active={openPopover === 'mode'}
                  onClick={() => setOpenPopover((value) => value === 'mode' ? null : 'mode')}
                />
                <FloatingPopover
                  open={openPopover === 'mode'}
                  anchorRef={modeButtonRef}
                  className="composer-inline-popover"
                  placement="auto"
                  offset={10}
                  minWidth={250}
                  onDismiss={() => setOpenPopover(null)}
                >
                  <button type="button" className={`popover-choice ${mode === 'generate' ? 'active' : ''}`} onClick={() => { onModeChange('generate'); setOpenPopover(null); }}>
                    <strong>{t('composer.generate')}</strong>
                    <small>{t('composer.placeholder.generate')}</small>
                  </button>
                  <button type="button" className={`popover-choice ${mode === 'edit' ? 'active' : ''}`} onClick={() => { onModeChange('edit'); setOpenPopover(null); }}>
                    <strong>{t('composer.edit')}</strong>
                    <small>{t('composer.placeholder.edit')}</small>
                  </button>
                </FloatingPopover>
              </div>

              <div className={`composer-popover-wrap ${openPopover === 'assets' ? 'open' : ''}`}>
                <ActionIconButton
                  buttonRef={assetsButtonRef}
                  icon="⊞"
                  label={`${t('composer.target')} / ${t('composer.refs')} / ${t('composer.mask')}`}
                  active={openPopover === 'assets'}
                  onClick={() => setOpenPopover((value) => value === 'assets' ? null : 'assets')}
                />
                <FloatingPopover
                  open={openPopover === 'assets'}
                  anchorRef={assetsButtonRef}
                  className="composer-inline-popover"
                  placement="auto"
                  offset={10}
                  minWidth={250}
                  onDismiss={() => setOpenPopover(null)}
                >
                  <button type="button" className="popover-choice" onClick={() => targetRef.current?.click()}>
                    <strong>{t('composer.target')}</strong>
                    <small>{targetImage ? targetImage.name : t('composer.targetTitle')}</small>
                  </button>
                  <button type="button" className="popover-choice" onClick={() => refsRef.current?.click()}>
                    <strong>{t('composer.refs')}</strong>
                    <small>{referenceImages.length > 0 ? `${referenceImages.length}` : t('composer.refsTitle')}</small>
                  </button>
                  <button type="button" className="popover-choice" onClick={() => maskRef.current?.click()}>
                    <strong>{t('composer.mask')}</strong>
                    <small>{mask ? mask.name : t('composer.maskTitle')}</small>
                  </button>
                  {attachments.length > 0 && (
                    <button type="button" className="popover-choice danger" onClick={clearAttachments}>
                      <strong>×</strong>
                      <small>{t('composer.clearAttachments')}</small>
                    </button>
                  )}
                </FloatingPopover>
              </div>

              <ActionIconButton icon="☷" label={t('batch.open')} onClick={onOpenBatchComposer} />
              <ActionIconButton icon="⚙" label={t('composer.paramsTitle')} onClick={onOpenParameters} />
            </div>
          </div>

          <div className="composer-actions-right">
            <span className="composer-hint">{t('composer.shortcut')}</span>
            <button type="button" className="send-button" disabled={!canSubmit} onClick={onSubmit} aria-label={mode === 'generate' ? t('composer.submitGenerate') : t('composer.submitEdit')}>
              {busy ? t('composer.busy') : t('composer.send')}
            </button>
          </div>
        </div>
      </div>

      {(statusText || (mode === 'edit' && !targetImage)) && (
        <div className="composer-status-row">
          {statusText && <p className="composer-note strong">{statusText}</p>}
          {mode === 'edit' && !targetImage && <p className="composer-note">{t('composer.editNeedsTarget')}</p>}
        </div>
      )}
    </section>
  );
}
