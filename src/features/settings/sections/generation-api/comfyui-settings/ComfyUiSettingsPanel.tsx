import { getProviderAdapterForSettings } from '../../../../../entities/provider/registry';
import { useI18n } from '../../../../../i18n';
import { Button, PopoverSelect } from '../../../../../shared/ui';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import { FieldShell } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { fieldId } from '../utils';
import { ComfyUiLoraRegistryPanel } from './ComfyUiLoraRegistryPanel';
import { ComfyUiResourceStats } from './ComfyUiResourceStats';
import styles from './ComfyUiSettingsPanel.module.css';

type Props = {
  context: SettingsSectionContext;
};

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
    comfyUiUpscaleModelCache,
    comfyUiResourcesLoading,
    comfyUiResourcesError,
    refreshComfyUiResources,
    addComfyUiProvider,
    comfyUiData
  } = context;

  const providerOptions = comfyUiProviders.map((provider) => ({
    value: provider.id,
    label: provider.name || t('settings.unnamedProvider'),
    description: provider.generationEndpoint || t('detail.notSet')
  }));

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
  const resourceCaches = [comfyUiCheckpointCache, comfyUiLoraCache, comfyUiSamplerCache, comfyUiSchedulerCache, comfyUiUpscaleModelCache];
  const missingRegisteredLora = comfyUiLoraCache && comfyUiData.loras.some((lora) => lora.loraName && !comfyUiLoraCache.items.some((item) => item.name === lora.loraName || item.id === lora.loraName));

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
          <ComfyUiResourceStats
            labels={{
              checkpoints: t('settings.comfy.checkpoints'),
              loras: t('settings.comfy.loras'),
              samplers: t('settings.comfy.samplers'),
              schedulers: t('settings.comfy.schedulers'),
              upscaleModels: t('settings.comfy.upscaleModels'),
              notLoaded: t('settings.comfy.notLoaded')
            }}
            caches={{
              checkpoints: comfyUiCheckpointCache,
              loras: comfyUiLoraCache,
              samplers: comfyUiSamplerCache,
              schedulers: comfyUiSchedulerCache,
              upscaleModels: comfyUiUpscaleModelCache
            }}
          />
        </div>

        {comfyUiResourcesError && <div className={`${styles.notice} ${styles.error}`}>{comfyUiResourcesError}</div>}
        {comfyUiCheckpointCache && comfyUiCheckpointCache.items.length === 0 && <div className={`${styles.notice} ${styles.error}`}>{t('settings.comfy.noCheckpointsFound')}</div>}
        {missingRegisteredLora && <div className={`${styles.notice} ${styles.error}`}>{t('settings.comfy.missingRegisteredLora')}</div>}
        {resourceCaches.flatMap((cache) => cache?.warning ? [cache.warning] : []).map((warning) => (
          <div className={styles.notice} key={warning}>{warning}</div>
        ))}
      </article>

      <ComfyUiLoraRegistryPanel context={context} />
    </section>
  );
}
