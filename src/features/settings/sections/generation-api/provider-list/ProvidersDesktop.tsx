import { useI18n } from '../../../../../i18n';
import { Button, EntityList, EntityListItem, SideInspector } from '../../../../../shared/ui';
import { EmptyState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiDesktopPanels.module.css';
import { ProviderCheckCard } from '../provider-check-panel/ProviderCheckCard';
import { ProviderEditor } from '../provider-editor/ProviderEditor';

export function ProvidersDesktop({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const {
    draft,
    selectedProvider,
    addProvider,
    setSelectedProviderId,
    setSelectedModelId,
    firstModelForProvider
  } = context;

  return (
    <div className={styles.focusLayout}>
      <section className={styles.listPanel}>
        <div className={styles.columnHead}>
          <div>
            <h4>{t('settings.providers')}</h4>
            <p>{t('settings.providersHint')}</p>
          </div>
          <Button variant="secondary" size="micro" onClick={addProvider}>+ {t('settings.addProvider')}</Button>
        </div>

        <EntityList density="comfortable" className={styles.entityList}>
          {draft.providers.map((provider) => {
            const relatedModels = draft.models.filter((model) => model.providerId === provider.id).length;
            return (
              <EntityListItem
                key={provider.id}
                title={provider.name || t('settings.unnamedProvider')}
                description={provider.generationEndpoint || t('detail.notSet')}
                meta={t('settings.modelsCount', { count: relatedModels })}
                leading={<span className={styles.entityMarker} aria-hidden="true" />}
                selected={provider.id === selectedProvider?.id}
                onClick={() => {
                  setSelectedProviderId(provider.id);
                  const model = firstModelForProvider(draft, provider.id);
                  if (model) setSelectedModelId(model.id);
                }}
              />
            );
          })}
        </EntityList>
      </section>

      <SideInspector
        className={styles.inspectorPanel}
        density="compact"
        title={selectedProvider ? (selectedProvider.name || t('settings.unnamedProvider')) : t('settings.providerEditor')}
        description={selectedProvider ? selectedProvider.generationEndpoint || t('detail.notSet') : t('settings.noProvidersText')}
      >
        {selectedProvider ? (
          <div className={styles.inspectorBody}>
            <ProviderEditor context={context} />
            <ProviderCheckCard context={context} />
          </div>
        ) : (
          <EmptyState title={t('settings.noProviders')} text={t('settings.noProvidersText')} />
        )}
      </SideInspector>
    </div>
  );
}
