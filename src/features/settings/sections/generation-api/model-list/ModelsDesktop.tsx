import { useI18n } from '../../../../../i18n';
import { Button, EntityList, EntityListItem, SideInspector } from '../../../../../shared/ui';
import { EmptyState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiDesktopPanels.module.css';
import { ModelEditor } from '../model-editor/ModelEditor';

export function ModelsDesktop({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const {
    draft,
    selectedModel,
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
          <Button variant="secondary" size="micro" onClick={addModel}>+ {t('settings.addModel')}</Button>
        </div>

        <EntityList density="comfortable" className={styles.entityList}>
          {draft.models.map((model) => {
            const provider = draft.providers.find((item) => item.id === model.providerId);
            return (
              <EntityListItem
                key={model.id}
                title={model.name || model.modelId}
                description={model.modelId}
                meta={provider?.name ?? t('detail.notSet')}
                leading={<span className={styles.entityMarker} aria-hidden="true" />}
                selected={model.id === selectedModel?.id}
                onClick={() => selectModel(model)}
              />
            );
          })}
        </EntityList>
      </section>

      <SideInspector
        className={styles.inspectorPanel}
        density="compact"
        title={selectedModel ? (selectedModel.name || selectedModel.modelId) : t('settings.modelEditor')}
        description={selectedModel ? selectedModel.modelId : t('settings.noModelsText')}
      >
        {selectedModel ? (
          <div className={styles.inspectorBody}>
            <ModelEditor context={context} />
          </div>
        ) : (
          <EmptyState title={t('settings.noModels')} text={t('settings.noModelsText')} />
        )}
      </SideInspector>
    </div>
  );
}
