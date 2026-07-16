import { useI18n } from '../../../../../i18n';
import { Button, DisclosureChevron } from '../../../../../shared/ui';
import { EmptyState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiMobilePanels.module.css';
import { ModelFields } from '../model-editor/ModelFields';

export function ModelsMobile({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const { draft, selectedModel, addModel, removeModel, selectModel } = context;

  return (
    <>
      <article className={`${styles.mobileCard} glass-panel`}>
        <div className={`${styles.mobileCardHead} ${styles.compact}`}>
          <div>
            <span className="section-kicker">{t('settings.models')}</span>
            <h3>{t('settings.models')}</h3>
            <p>{t('settings.modelsHint')}</p>
          </div>
          <Button variant="secondary" size="micro" onClick={addModel}>+ {t('settings.addModel')}</Button>
        </div>
        <div className={styles.mobileEntityStrip}>
          {draft.models.map((model) => {
            const provider = draft.providers.find((item) => item.id === model.providerId);
            return (
              <button
                type="button"
                key={model.id}
                className={`${styles.mobileEntityPill} ${model.id === selectedModel?.id ? styles.active : ''}`}
                onClick={() => selectModel(model)}
              >
                <strong>{model.name || model.modelId}</strong>
                <span>{model.modelId}</span>
                <small>{provider?.name ?? t('detail.notSet')}</small>
              </button>
            );
          })}
        </div>
      </article>

      {selectedModel ? (
        <article className={`${styles.mobileCard} glass-panel`}>
          <div className={`${styles.mobileCardHead} ${styles.compact}`}>
            <div>
              <span className="section-kicker">{t('settings.modelEditor')}</span>
              <h3>{selectedModel.name || selectedModel.modelId}</h3>
            </div>
            <Button variant="secondary" size="micro" tone="danger" onClick={removeModel} disabled={draft.models.length <= 1}>{t('settings.deleteModel')}</Button>
          </div>

          <details className={styles.mobileAccordion}>
            <summary><span>{t('settings.modelEditor')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ModelFields context={context} idPrefix="mobile" mobile />
          </details>
        </article>
      ) : (
        <EmptyState title={t('settings.noModels')} text={t('settings.noModelsText')} />
      )}
    </>
  );
}
