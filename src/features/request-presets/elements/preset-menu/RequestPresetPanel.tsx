import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../../i18n';
import type { RequestPreset } from '../../../../entities/request-presets';
import styles from './RequestPresetMenuAction.module.css';
import type { RequestPresetManagerController } from './requestPresetMenuController';

function formatPresetDate(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(value);
  } catch {
    return '';
  }
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

export function PresetPanel({ controller, close }: { controller: RequestPresetManagerController; close: () => void }) {
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
