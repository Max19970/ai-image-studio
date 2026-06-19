import { cacheKeyForComfyUiResources } from '../../../../../domain/comfyUiSettings';
import { getProviderAdapterForSettings } from '../../../../../entities/provider/registry';
import { useI18n } from '../../../../../i18n';
import { Button, PopoverSelect } from '../../../../../shared/ui';
import { FieldShell } from '../../../components/SettingsControls';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { fieldId } from '../utils';

function resourceOptions(context: SettingsSectionContext, providerId: string, current: string) {
  const cache = context.comfyUiData.resourceCache[cacheKeyForComfyUiResources(providerId, 'checkpoints')];
  const values = new Map<string, { value: string; label: string; description?: string }>();
  if (current.trim()) values.set(current, { value: current, label: current, description: 'manual value' });
  cache?.items.forEach((item) => values.set(item.name, {
    value: item.name,
    label: item.name,
    description: item.nativeName && item.nativeName !== item.name ? item.nativeName : item.description
  }));
  return { cache, options: [...values.values()] };
}

function ModelIdField({ context, idPrefix }: { context: SettingsSectionContext; idPrefix: string }) {
  const { t } = useI18n();
  const { selectedModel, patchModel, activeInfo, setActiveInfo, refreshComfyUiResources, comfyUiResourcesLoading } = context;
  if (!selectedModel) return null;
  const provider = context.draft.providers.find((item) => item.id === selectedModel.providerId) ?? null;
  const adapter = getProviderAdapterForSettings(provider);

  if (adapter.modelResourceKind === 'checkpoints') {
    const { cache, options } = resourceOptions(context, selectedModel.providerId, selectedModel.modelId);
    return (
      <FieldShell id={fieldId(idPrefix, 'modelId')} label={t('settings.comfy.checkpointModel')} info={t('settings.comfy.info.checkpointModel')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <div className={styles.editor}>
          {options.length ? (
            <PopoverSelect
              value={selectedModel.modelId}
              onChange={(value) => patchModel('modelId', value)}
              options={options}
              ariaLabel={t('settings.comfy.checkpointModel')}
              className={selectStyles.root}
              triggerClassName={selectStyles.trigger}
              panelClassName={selectStyles.panel}
              showSelectedDescription
            />
          ) : (
            <input className="field-input" value={selectedModel.modelId} onChange={(e) => patchModel('modelId', e.target.value)} placeholder="model.safetensors" />
          )}
          {!cache && (
            <div className="info-strip">{t('settings.comfy.checkpointFallback')}</div>
          )}
          {provider && (
            <Button variant="secondary" size="micro" onClick={() => void refreshComfyUiResources(provider.id)} disabled={comfyUiResourcesLoading}>
              {comfyUiResourcesLoading ? t('settings.comfy.refreshing') : t('settings.comfy.refresh')}
            </Button>
          )}
        </div>
      </FieldShell>
    );
  }

  return (
    <FieldShell id={fieldId(idPrefix, 'modelId')} label={t('settings.modelId')} info={t('settings.info.modelId')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
      <input className="field-input" value={selectedModel.modelId} onChange={(e) => patchModel('modelId', e.target.value)} placeholder="gpt-image-2" />
    </FieldShell>
  );
}

export function ModelFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedModel, patchModel, setSelectedProviderId, providerOptions, activeInfo, setActiveInfo } = context;
  if (!selectedModel) return null;

  return (
    <div className={`${styles.fieldGrid} ${mobile ? styles.mobileFieldStack : ''}`}>
      <FieldShell id={fieldId(idPrefix, 'modelName')} label={t('settings.modelName')} info={t('settings.info.modelName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedModel.name} onChange={(e) => patchModel('name', e.target.value)} />
      </FieldShell>
      <ModelIdField context={context} idPrefix={idPrefix} />
      <FieldShell id={fieldId(idPrefix, 'modelProvider')} label={t('settings.modelProvider')} info={t('settings.info.modelProvider')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <PopoverSelect
          value={selectedModel.providerId}
          onChange={(value) => {
            patchModel('providerId', value);
            setSelectedProviderId(value);
          }}
          options={providerOptions}
          ariaLabel={t('settings.modelProvider')}
          className={selectStyles.root}
          triggerClassName={selectStyles.trigger}
          panelClassName={selectStyles.panel}
          showSelectedDescription
        />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'modelNotes')} label={t('settings.modelNotes')} info={t('settings.info.modelNotes')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <textarea className="field-input min-h-[92px]" value={selectedModel.notes} onChange={(e) => patchModel('notes', e.target.value)} />
      </FieldShell>
    </div>
  );
}
