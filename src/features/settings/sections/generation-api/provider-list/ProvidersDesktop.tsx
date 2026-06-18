import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui';
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
          <Button variant="secondary" onClick={addProvider}>+ {t('settings.addProvider')}</Button>
        </div>

        <div className={styles.entityList}>
          {draft.providers.map((provider) => {
            const relatedModels = draft.models.filter((model) => model.providerId === provider.id).length;
            return (
              <button
                type="button"
                key={provider.id}
                className={`${styles.entityCard} ${provider.id === selectedProvider?.id ? styles.active : ''}`}
                onClick={() => {
                  setSelectedProviderId(provider.id);
                  const model = firstModelForProvider(draft, provider.id);
                  if (model) setSelectedModelId(model.id);
                }}
              >
                <strong>{provider.name || t('settings.unnamedProvider')}</strong>
                <span>{provider.generationEndpoint || t('detail.notSet')}</span>
                <small>{t('settings.modelsCount', { count: relatedModels })}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.inspectorPanel}>
        {selectedProvider ? (
          <>
            <ProviderEditor context={context} />
            <ProviderCheckCard context={context} />
          </>
        ) : (
          <EmptyState title={t('settings.noProviders')} text={t('settings.noProvidersText')} />
        )}
      </section>
    </div>
  );
}
