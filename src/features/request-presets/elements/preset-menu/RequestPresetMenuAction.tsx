import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { BottomSheet, FloatingPopover } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import type { RequestPreset } from '../../../../entities/request-presets';
import type { ComposerActionContext } from '../../../composer/composerTypes';
import popoverStyles from '../../../composer/ui/ComposerPopover.module.css';
import styles from './RequestPresetMenuAction.module.css';

const popoverId = 'request-presets.menu';

export interface RequestPresetManagerController {
  requestPresets: RequestPreset[];
  defaultName: string;
  saveCurrent: (name?: string, note?: string) => void;
  applyPreset: (presetId: string) => void;
  updatePreset: (presetId: string, patch: { name?: string; note?: string; captureCurrent?: boolean }) => void;
  deletePreset: (presetId: string) => void;
}

interface RequestPresetManagerDialogProps {
  open: boolean;
  controller: RequestPresetManagerController;
  onClose: () => void;
  testId?: string;
}

function formatPresetDate(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(value);
  } catch {
    return '';
  }
}

function getDefaultDraftName(context: ComposerActionContext) {
  const prompt = context.params.prompt.trim().replace(/\s+/g, ' ');
  if (prompt) return prompt.length > 52 ? `${prompt.slice(0, 49)}…` : prompt;
  return context.selectedModel?.name || context.selectedModel?.modelId || '';
}

export function createComposerPresetManagerController(context: ComposerActionContext): RequestPresetManagerController {
  return {
    requestPresets: context.requestPresets,
    defaultName: getDefaultDraftName(context),
    saveCurrent: context.requestPresetActions.saveCurrent,
    applyPreset: context.requestPresetActions.applyPreset,
    updatePreset: context.requestPresetActions.updatePreset,
    deletePreset: context.requestPresetActions.deletePreset
  };
}

function PresetMetaLine({ preset }: { preset: RequestPreset }) {
  const meta = [
    preset.meta.providerLabel,
    preset.meta.modelLabel,
    preset.meta.providerModeLabel
  ].filter(Boolean).join(' · ');
  return <small>{meta || formatPresetDate(preset.updatedAt)}</small>;
}

function presetMatchesSearch(preset: RequestPreset, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    preset.name,
    preset.note,
    preset.snapshot.params.prompt,
    preset.meta.providerLabel,
    preset.meta.modelLabel,
    preset.meta.providerModeLabel,
    preset.meta.providerId,
    preset.meta.modelId
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function PresetPanel({ controller, close }: { controller: RequestPresetManagerController; close: () => void }) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingPreset = useMemo(
    () => controller.requestPresets.find((preset) => preset.id === editingId) ?? null,
    [controller.requestPresets, editingId]
  );
  const [name, setName] = useState(() => controller.defaultName);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const visiblePresets = useMemo(
    () => controller.requestPresets.filter((preset) => presetMatchesSearch(preset, search)),
    [controller.requestPresets, search]
  );

  useEffect(() => {
    if (!editingPreset) return;
    setName(editingPreset.name);
    setNote(editingPreset.note);
  }, [editingPreset]);

  useEffect(() => {
    if (editingPreset) return;
    setName(controller.defaultName);
  }, [controller.defaultName, editingPreset]);

  const resetDraft = () => {
    setEditingId(null);
    setName(controller.defaultName);
    setNote('');
  };

  const saveCurrent = () => {
    controller.saveCurrent(name, note);
    resetDraft();
  };

  const updatePreset = () => {
    if (!editingPreset) return;
    controller.updatePreset(editingPreset.id, { name, note });
    resetDraft();
  };

  const updatePresetFromCurrent = () => {
    if (!editingPreset) return;
    controller.updatePreset(editingPreset.id, { name, note, captureCurrent: true });
    resetDraft();
  };

  const applyPreset = (preset: RequestPreset) => {
    controller.applyPreset(preset.id);
    close();
  };

  const deletePreset = (preset: RequestPreset) => {
    controller.deletePreset(preset.id);
    if (editingId === preset.id) resetDraft();
  };

  return (
    <div className={styles.panel} data-testid="request-presets-panel">
      <div className={styles.hero}>
        <span className={styles.heroKicker}>{t('requestPresets.kicker')}</span>
        <strong>{t('requestPresets.title')}</strong>
        <small>{t('requestPresets.description')}</small>
      </div>

      <div className={styles.editor} data-editing={editingPreset ? 'true' : 'false'}>
        <label className={styles.field}>
          <span>{t('requestPresets.name')}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('requestPresets.namePlaceholder')} />
        </label>
        <label className={styles.field}>
          <span>{t('requestPresets.note')}</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('requestPresets.notePlaceholder')} rows={2} />
        </label>
        <div className={styles.editorActions}>
          {editingPreset ? (
            <>
              <button type="button" className={styles.softButton} onClick={updatePreset}>{t('requestPresets.rename')}</button>
              <button type="button" className={styles.primaryButton} onClick={updatePresetFromCurrent}>{t('requestPresets.updateFromCurrent')}</button>
              <button type="button" className={styles.ghostButton} onClick={resetDraft}>{t('requestPresets.cancelEdit')}</button>
            </>
          ) : (
            <button type="button" className={styles.primaryButton} data-testid="request-presets-save-current" onClick={saveCurrent}>{t('requestPresets.saveCurrent')}</button>
          )}
        </div>
      </div>

      <label className={`${styles.field} ${styles.searchField}`}>
        <span>{t('requestPresets.search')}</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('requestPresets.searchPlaceholder')}
          data-testid="request-presets-search"
        />
      </label>

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <span>{search.trim() ? t('requestPresets.searchResults') : t('requestPresets.saved')}</span>
          <em>{visiblePresets.length}/{controller.requestPresets.length}</em>
        </div>
        {controller.requestPresets.length === 0 ? (
          <div className={styles.empty}>{t('requestPresets.empty')}</div>
        ) : visiblePresets.length === 0 ? (
          <div className={styles.empty}>{t('requestPresets.emptySearch')}</div>
        ) : visiblePresets.map((preset) => (
          <article key={preset.id} className={styles.card} data-active={editingId === preset.id}>
            <button type="button" className={styles.cardMain} onClick={() => applyPreset(preset)}>
              <strong>{preset.name}</strong>
              <PresetMetaLine preset={preset} />
              <span>{preset.snapshot.params.prompt || t('requestPresets.noPrompt')}</span>
            </button>
            {preset.note && <p>{preset.note}</p>}
            <div className={styles.cardActions}>
              <button type="button" onClick={() => setEditingId(preset.id)}>{t('requestPresets.edit')}</button>
              <button type="button" onClick={() => applyPreset(preset)}>{t('requestPresets.apply')}</button>
              <button type="button" className={styles.dangerButton} onClick={() => deletePreset(preset)}>{t('requestPresets.delete')}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function RequestPresetManagerDialog({ open, controller, onClose, testId = 'request-presets-dialog' }: RequestPresetManagerDialogProps) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || isMobile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, onClose, open]);

  if (!open) return null;

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title={t('requestPresets.title')}
        description={t('requestPresets.description')}
        size="content"
        compactHeader
        scrollHint
        onClose={onClose}
      >
        <PresetPanel controller={controller} close={onClose} />
      </BottomSheet>
    );
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.dialogBackdrop} data-testid={testId} onPointerDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialogShell}
        role="dialog"
        aria-modal="true"
        aria-label={t('requestPresets.title')}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.dialogClose} aria-label={t('requestPresets.close')} onClick={onClose}>×</button>
        <PresetPanel controller={controller} close={onClose} />
      </div>
    </div>,
    document.body
  );
}

export function RequestPresetMenuAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 860px)');
  const open = context.openPopover === popoverId;
  const toggle = () => context.setOpenPopover((value) => value === popoverId ? null : popoverId);
  const close = () => context.setOpenPopover(null);
  const controller = createComposerPresetManagerController(context);

  return (
    <div className={styles.wrapper} data-slot-contribution="request-presets">
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        data-testid="composer-request-presets"
        data-open={open ? 'true' : 'false'}
        aria-label={t('requestPresets.title')}
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true">✦</span>
        {context.requestPresets.length > 0 && <em>{context.requestPresets.length}</em>}
      </button>

      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={buttonRef}
          className={`${popoverStyles.panel} composer-inline-popover`}
          placement="auto"
          offset={10}
          minWidth={390}
          onDismiss={close}
        >
          <PresetPanel controller={controller} close={close} />
        </FloatingPopover>
      )}

      {isMobile && (
        <BottomSheet
          open={open}
          title={t('requestPresets.title')}
          description={t('requestPresets.description')}
          size="content"
          compactHeader
          scrollHint
          onClose={close}
        >
          <PresetPanel controller={controller} close={close} />
        </BottomSheet>
      )}
    </div>
  );
}
