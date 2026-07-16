import { useI18n } from '../../../../../i18n';
import { Button, DisclosureChevron } from '../../../../../shared/ui';
import { EmptyState } from '../../../components/SettingsControls';
import type { SettingsSectionContext } from '../../../settingsTypes';
import { ProviderCustomHeadersField } from '../custom-headers-editor/ProviderCustomHeadersField';
import styles from '../GenerationApiMobilePanels.module.css';
import { ProviderCheckCard } from '../provider-check-panel/ProviderCheckCard';
import { ProviderAuthFields } from '../provider-editor/ProviderAuthFields';
import { ProviderCoreFields } from '../provider-editor/ProviderCoreFields';
import { ProviderEndpointFields } from '../provider-editor/ProviderEndpointFields';

export function ProvidersMobile({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const {
    draft,
    selectedProvider,
    addProvider,
    removeProvider,
    setSelectedProviderId,
    setSelectedModelId,
    firstModelForProvider
  } = context;

  return (
    <>
      <article className={`${styles.mobileCard} glass-panel`}>
        <div className={`${styles.mobileCardHead} ${styles.compact}`}>
          <div>
            <span className="section-kicker">{t('settings.providers')}</span>
            <h3>{t('settings.providers')}</h3>
            <p>{t('settings.providersHint')}</p>
          </div>
          <Button variant="secondary" size="micro" onClick={addProvider}>+ {t('settings.addProvider')}</Button>
        </div>
        <div className={styles.mobileEntityStrip}>
          {draft.providers.map((provider) => {
            const relatedModels = draft.models.filter((model) => model.providerId === provider.id).length;
            return (
              <button
                type="button"
                key={provider.id}
                className={`${styles.mobileEntityPill} ${provider.id === selectedProvider?.id ? styles.active : ''}`}
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
      </article>

      {selectedProvider ? (
        <article className={`${styles.mobileCard} glass-panel`}>
          <div className={`${styles.mobileCardHead} ${styles.compact}`}>
            <div>
              <span className="section-kicker">{t('settings.providerEditor')}</span>
              <h3>{selectedProvider.name || t('settings.unnamedProvider')}</h3>
            </div>
            <Button variant="secondary" size="micro" tone="danger" onClick={removeProvider} disabled={draft.providers.length <= 1}>{t('settings.deleteProvider')}</Button>
          </div>

          <details className={styles.mobileAccordion} open>
            <summary><span>{t('settings.providerEditor')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ProviderCoreFields context={context} idPrefix="mobile" mobile />
          </details>

          <details className={styles.mobileAccordion}>
            <summary><span>{t('settings.endpoints')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ProviderEndpointFields context={context} idPrefix="mobile" mobile />
          </details>

          <details className={styles.mobileAccordion}>
            <summary><span>{t('settings.auth')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ProviderAuthFields context={context} idPrefix="mobile" mobile />
          </details>

          <details className={styles.mobileAccordion}>
            <summary><span>{t('settings.customHeaders')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ProviderCustomHeadersField context={context} idPrefix="mobile" />
          </details>

          <details className={styles.mobileAccordion}>
            <summary><span>{t('settings.providerChecks')}</span><DisclosureChevron className={styles.disclosureChevron} /></summary>
            <ProviderCheckCard context={context} mobile />
          </details>
        </article>
      ) : (
        <EmptyState title={t('settings.noProviders')} text={t('settings.noProvidersText')} />
      )}
    </>
  );
}
