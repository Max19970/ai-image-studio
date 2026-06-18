import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui';
import { EmptyState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiDesktopPanels.module.css';
import { ModelEditor } from '../model-editor/ModelEditor';

export function ModelsDesktop({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const {
    draft,
    selectedModel,
    selectedProvider,
    modelsForSelectedProvider,
    addModel,
    selectModel
  } = context;

  return (
    <div className={styles.focusLayout}>
      <section className={styles.listPanel}>
        <div className={styles.columnHead}>
          <div>
            <h4>{t('settings.models')}</h4>
            <p>{t('settings.modelsHint')}</p>
          </div>
          <Button variant="secondary" onClick={addModel}>+ {t('settings.addModel')}</Button>
        </div>

        <div className={styles.entityList}>
          {draft.models.map((model) => {
            const provider = draft.providers.find((item) => item.id === model.providerId);
            return (
              <button
                type="button"
                key={model.id}
                className={`${styles.entityCard} ${model.id === selectedModel?.id ? styles.active : ''}`}
                onClick={() => selectModel(model)}
              >
                <strong>{model.name || model.modelId}</strong>
                <span>{model.modelId}</span>
                <small>{provider?.name ?? t('detail.notSet')}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.inspectorPanel}>
        {selectedModel ? (
          <>
            <ModelEditor context={context} />

            <div className={styles.activeModelCard}>
              <div>
                <span className="section-kicker">{t('settings.activeModel')}</span>
                <strong>{selectedModel.name || selectedModel.modelId}</strong>
                <p>{t('settings.activeModelHint')}</p>
              </div>
              <Button variant="primary" onClick={() => selectModel(selectedModel)}>{t('settings.useModel')}</Button>
            </div>

            {selectedProvider && modelsForSelectedProvider.length > 0 && (
              <div className={styles.emptyCard}>
                <strong>{selectedProvider.name}</strong>
                <span>{t('settings.modelsCount', { count: modelsForSelectedProvider.length })}</span>
              </div>
            )}
          </>
        ) : (
          <EmptyState title={t('settings.noModels')} text={t('settings.noModelsText')} />
        )}
      </section>
    </div>
  );
}
