import { useEffect, useMemo, useState } from 'react';
import { cacheKeyForComfyUiResources, type ComfyUiResourceCacheEntry } from '../../../../../domain/comfyUiSettings';
import { getProviderAdapterForSettings } from '../../../../../entities/provider/registry';
import { useI18n } from '../../../../../i18n';
import { Button, PopoverSelect } from '../../../../../shared/ui';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import { EmptyState, FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { fieldId } from '../utils';
import styles from './ComfyUiSettingsPanel.module.css';

type Props = {
  context: SettingsSectionContext;
};

function cacheAge(cache: ComfyUiResourceCacheEntry | null, fallback: string) {
  if (!cache) return fallback;
  return new Date(cache.createdAt).toLocaleString();
}

function resourceOptions(cache: ComfyUiResourceCacheEntry | null, current = '') {
  const values = new Map<string, { value: string; label: string; description?: string }>();
  if (current.trim()) values.set(current, { value: current, label: current, description: 'manual value' });
  cache?.items.forEach((item) => {
    values.set(item.name, {
      value: item.name,
      label: item.name,
      description: item.nativeName && item.nativeName !== item.name ? item.nativeName : item.description
    });
  });
  return [...values.values()];
}

function cacheStat({ label, cache, emptyLabel }: { label: string; cache: ComfyUiResourceCacheEntry | null; emptyLabel: string }) {
  return (
    <div className={styles.statCard}>
      <span>{label}</span>
      <strong>{cache ? cache.items.length : 0}</strong>
      <small>{cacheAge(cache, emptyLabel)}</small>
    </div>
  );
}

export function ComfyUiSettingsPanel({ context }: Props) {
  const { t } = useI18n();
  const {
    activeInfo,
    setActiveInfo,
    comfyUiProviders,
    selectedComfyUiProvider,
    selectedComfyUiProviderId,
    setSelectedComfyUiProviderId,
    comfyUiCheckpointCache,
    comfyUiLoraCache,
    comfyUiSamplerCache,
    comfyUiSchedulerCache,
    comfyUiResourcesLoading,
    comfyUiResourcesError,
    refreshComfyUiResources,
    addComfyUiProvider,
    comfyUiData,
    addComfyUiLora,
    removeComfyUiLora,
    patchComfyUiLora
  } = context;

  const providerOptions = comfyUiProviders.map((provider) => ({
    value: provider.id,
    label: provider.name || t('settings.unnamedProvider'),
    description: provider.generationEndpoint || t('detail.notSet')
  }));
  const loraOptions = resourceOptions(comfyUiLoraCache);
  const [selectedLoraId, setSelectedLoraId] = useState(() => comfyUiData.loras[0]?.id ?? '');
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

  if (!selectedComfyUiProvider) {
    return (
      <section className={styles.emptyCard} data-settings-section="comfyui">
        <h4>{t('settings.comfy.emptyTitle')}</h4>
        <p>{t('settings.comfy.emptyText')}</p>
        <div className={styles.actions}>
          <Button data-testid="settings-comfy-add-provider" variant="primary" size="compact" onClick={addComfyUiProvider}>+ {t('settings.comfy.addProvider')}</Button>
        </div>
      </section>
    );
  }

  const adapter = getProviderAdapterForSettings(selectedComfyUiProvider);

  return (
    <section className={styles.panel} data-settings-section="comfyui">
      <article className={styles.topCard}>
        <div className={styles.headerRow}>
          <div className={styles.headerCopy}>
            <span className="section-kicker">{adapter.label}</span>
            <h4>{t('settings.comfy.title')}</h4>
            <p>{t('settings.comfy.text')}</p>
          </div>
          <div className={styles.actions}>
            <Button data-testid="settings-comfy-add-provider" variant="secondary" size="micro" onClick={addComfyUiProvider}>+ {t('settings.comfy.addProvider')}</Button>
            <Button data-testid="settings-comfy-refresh" variant="primary" size="micro" onClick={() => void refreshComfyUiResources(selectedComfyUiProvider.id)} disabled={comfyUiResourcesLoading}>
              {comfyUiResourcesLoading ? t('settings.comfy.refreshing') : t('settings.comfy.refresh')}
            </Button>
          </div>
        </div>

        <div className={styles.providerGrid}>
          <FieldShell id={fieldId('comfyui', 'provider')} label={t('settings.comfy.provider')} info={t('settings.comfy.info.provider')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
            <PopoverSelect
              value={selectedComfyUiProviderId}
              onChange={setSelectedComfyUiProviderId}
              options={providerOptions}
              ariaLabel={t('settings.comfy.provider')}
              className={selectStyles.root}
              triggerClassName={selectStyles.trigger}
              panelClassName={selectStyles.panel}
              showSelectedDescription
            />
          </FieldShell>
          <div className={styles.resourceStats}>
            {cacheStat({ label: t('settings.comfy.checkpoints'), cache: comfyUiCheckpointCache, emptyLabel: t('settings.comfy.notLoaded') })}
            {cacheStat({ label: t('settings.comfy.loras'), cache: comfyUiLoraCache, emptyLabel: t('settings.comfy.notLoaded') })}
            {cacheStat({ label: t('settings.comfy.samplers'), cache: comfyUiSamplerCache, emptyLabel: t('settings.comfy.notLoaded') })}
            {cacheStat({ label: t('settings.comfy.schedulers'), cache: comfyUiSchedulerCache, emptyLabel: t('settings.comfy.notLoaded') })}
          </div>
        </div>

        {comfyUiResourcesError && <div className={`${styles.notice} ${styles.error}`}>{comfyUiResourcesError}</div>}
        {comfyUiCheckpointCache && comfyUiCheckpointCache.items.length === 0 && <div className={`${styles.notice} ${styles.error}`}>{t('settings.comfy.noCheckpointsFound')}</div>}
        {comfyUiLoraCache && comfyUiData.loras.some((lora) => lora.loraName && !comfyUiLoraCache.items.some((item) => item.name === lora.loraName || item.id === lora.loraName)) && (
          <div className={`${styles.notice} ${styles.error}`}>{t('settings.comfy.missingRegisteredLora')}</div>
        )}
        {[comfyUiCheckpointCache, comfyUiLoraCache, comfyUiSamplerCache, comfyUiSchedulerCache].flatMap((cache) => cache?.warning ? [cache.warning] : []).map((warning) => (
          <div className={styles.notice} key={warning}>{warning}</div>
        ))}
      </article>

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
              {comfyUiData.loras.map((lora) => (
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
    </section>
  );
}
