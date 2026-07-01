import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../../../../i18n';
import { Button, PopoverSelect } from '../../../../../shared/ui';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import { EmptyState, FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { fieldId } from '../utils';
import { resourceOptions } from './comfyUiResourceOptions';
import styles from './ComfyUiSettingsPanel.module.css';

interface ComfyUiLoraRegistryPanelProps {
  context: SettingsSectionContext;
}

export function ComfyUiLoraRegistryPanel({ context }: ComfyUiLoraRegistryPanelProps) {
  const { t } = useI18n();
  const {
    activeInfo,
    setActiveInfo,
    comfyUiLoraCache,
    comfyUiData,
    addComfyUiLora,
    removeComfyUiLora,
    patchComfyUiLora
  } = context;

  const loraOptions = resourceOptions(comfyUiLoraCache);
  const [selectedLoraId, setSelectedLoraId] = useState(() => comfyUiData.loras[0]?.id ?? '');
  const [loraSearch, setLoraSearch] = useState('');
  const visibleLoras = useMemo(() => {
    const query = loraSearch.trim().toLowerCase();
    if (!query) return comfyUiData.loras;
    return comfyUiData.loras.filter((lora) => [lora.displayName, lora.loraName, lora.notes].join('\n').toLowerCase().includes(query));
  }, [comfyUiData.loras, loraSearch]);
  const selectedLora = useMemo(
    () => comfyUiData.loras.find((lora) => lora.id === selectedLoraId) ?? comfyUiData.loras[0] ?? null,
    [comfyUiData.loras, selectedLoraId]
  );

  useEffect(() => {
    if (comfyUiData.loras.length === 0) {
      setSelectedLoraId('');
      return;
    }
    if (!selectedLoraId || !comfyUiData.loras.some((lora) => lora.id === selectedLoraId)) {
      setSelectedLoraId(comfyUiData.loras[0].id);
    }
  }, [comfyUiData.loras, selectedLoraId]);

  return (
    <article className={styles.registryCard}>
      <div className={styles.registryHead}>
        <div>
          <h4>{t('settings.comfy.loraRegistry')}</h4>
          <p>{t('settings.comfy.loraRegistryText')}</p>
        </div>
        <Button data-testid="settings-comfy-add-lora" variant="secondary" size="micro" onClick={addComfyUiLora}>+ {t('settings.comfy.addLora')}</Button>
      </div>

      {comfyUiData.loras.length === 0 || !selectedLora ? (
        <EmptyState title={t('settings.comfy.noLoras')} text={t('settings.comfy.noLorasText')} />
      ) : (
        <div className={styles.loraRegistryLayout}>
          <nav className={styles.loraNav} aria-label={t('settings.comfy.loraRegistry')}>
            <input
              className={styles.loraSearch}
              value={loraSearch}
              onChange={(event) => setLoraSearch(event.target.value)}
              placeholder={t('settings.comfy.loraSearch')}
              aria-label={t('settings.comfy.loraSearch')}
            />
            {visibleLoras.map((lora) => (
              <button
                key={lora.id}
                type="button"
                className={`${styles.loraNavButton} ${lora.id === selectedLora.id ? styles.loraNavButtonActive : ''}`.trim()}
                aria-current={lora.id === selectedLora.id ? 'true' : undefined}
                onClick={() => setSelectedLoraId(lora.id)}
              >
                <strong>{lora.displayName || lora.loraName || t('settings.comfy.unnamedLora')}</strong>
                <span>{lora.loraName || t('detail.notSet')}</span>
              </button>
            ))}
          </nav>

          <div className={styles.loraEditor}>
            <div className={styles.loraEditorHead}>
              <div>
                <strong>{selectedLora.displayName || selectedLora.loraName || t('settings.comfy.unnamedLora')}</strong>
                <span>{selectedLora.loraName || t('detail.notSet')}</span>
              </div>
              <Button variant="secondary" size="micro" tone="danger" onClick={() => removeComfyUiLora(selectedLora.id)}>{t('settings.deleteModel')}</Button>
            </div>
            <div className={styles.fieldGrid}>
              <FieldShell id={fieldId(`comfyui-${selectedLora.id}`, 'displayName')} label={t('settings.comfy.loraDisplayName')} info={t('settings.comfy.info.loraDisplayName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                <input className="field-input" value={selectedLora.displayName} onChange={(event) => patchComfyUiLora(selectedLora.id, 'displayName', event.target.value)} />
              </FieldShell>
              <FieldShell id={fieldId(`comfyui-${selectedLora.id}`, 'actualLora')} label={t('settings.comfy.actualLora')} info={t('settings.comfy.info.actualLora')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                {loraOptions.length ? (
                  <PopoverSelect
                    value={selectedLora.loraName}
                    onChange={(value) => patchComfyUiLora(selectedLora.id, 'loraName', value)}
                    options={resourceOptions(comfyUiLoraCache, selectedLora.loraName)}
                    ariaLabel={t('settings.comfy.actualLora')}
                    className={selectStyles.root}
                    triggerClassName={selectStyles.trigger}
                    panelClassName={selectStyles.panel}
                    showSelectedDescription
                  />
                ) : (
                  <input className="field-input" value={selectedLora.loraName} onChange={(event) => patchComfyUiLora(selectedLora.id, 'loraName', event.target.value)} placeholder="my_lora.safetensors" />
                )}
              </FieldShell>
              <FieldShell id={fieldId(`comfyui-${selectedLora.id}`, 'strengthModel')} label={t('settings.comfy.strengthModel')} info={t('settings.comfy.info.strength')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                <input className="field-input" type="number" min={-10} max={10} step={0.05} value={selectedLora.defaultStrengthModel} onChange={(event) => patchComfyUiLora(selectedLora.id, 'defaultStrengthModel', Number(event.target.value))} />
              </FieldShell>
              <FieldShell id={fieldId(`comfyui-${selectedLora.id}`, 'strengthClip')} label={t('settings.comfy.strengthClip')} info={t('settings.comfy.info.strength')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
                <input className="field-input" type="number" min={-10} max={10} step={0.05} value={selectedLora.defaultStrengthClip} onChange={(event) => patchComfyUiLora(selectedLora.id, 'defaultStrengthClip', Number(event.target.value))} />
              </FieldShell>
              <FieldShell id={fieldId(`comfyui-${selectedLora.id}`, 'notes')} label={t('settings.modelNotes')} info={t('settings.info.modelNotes')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
                <textarea className="field-input min-h-[84px]" value={selectedLora.notes} onChange={(event) => patchComfyUiLora(selectedLora.id, 'notes', event.target.value)} />
              </FieldShell>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
