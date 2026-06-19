import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { useI18n } from '../../../../i18n';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import styles from './GenerationApiSettingsSection.module.css';
import { ModelsDesktop } from './model-list/ModelsDesktop';
import { ModelsMobile } from './model-list/ModelsMobile';
import { ProvidersDesktop } from './provider-list/ProvidersDesktop';
import { ProvidersMobile } from './provider-list/ProvidersMobile';

type GenerationApiSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

export function GenerationApiSettingsSection({ context, props }: ElementDefinitionProps<SettingsSectionContext, GenerationApiSettingsSectionProps>) {
  if (props.variant === 'mobile') return <GenerationApiMobile context={context} />;
  return <GenerationApiDesktop context={context} />;
}

function GenerationApiDesktop({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const { apiFocus, setApiFocus } = context;

  return (
    <div className={styles.subpage} data-settings-section="generation-api" data-settings-variant="desktop">
      <div className={styles.heading}>
        <p className="section-kicker">{t('settings.tab.generationApi')}</p>
        <h3>{t('settings.apiTitle')}</h3>
        <p>{t('settings.apiText')}</p>
      </div>

      <div className={styles.focusSwitch} data-testid="settings-api-focus" role="tablist" aria-label={t('settings.apiTitle')}>
        <button type="button" className={apiFocus === 'providers' ? styles.active : ''} onClick={() => setApiFocus('providers')}>{t('settings.providers')}</button>
        <button type="button" className={apiFocus === 'models' ? styles.active : ''} onClick={() => setApiFocus('models')}>{t('settings.models')}</button>
      </div>

      {apiFocus === 'providers' ? <ProvidersDesktop context={context} /> : <ModelsDesktop context={context} />}
    </div>
  );
}

function GenerationApiMobile({ context }: { context: SettingsSectionContext }) {
  const { t } = useI18n();
  const { apiFocus, setApiFocus } = context;

  return (
    <section className={styles.mobileStack} data-settings-section="generation-api" data-settings-variant="mobile">
      <header className={styles.mobileApiHeader}>
        <div className={styles.mobileApiTitle}>
          <span className="section-kicker">{t('settings.tab.generationApi')}</span>
          <h3>{apiFocus === 'providers' ? t('settings.providers') : t('settings.models')}</h3>
        </div>
        <div className={styles.mobileApiSwitch} data-testid="settings-api-focus" role="tablist" aria-label={t('settings.apiTitle')}>
          <button type="button" className={apiFocus === 'providers' ? styles.active : ''} onClick={() => setApiFocus('providers')}>{t('settings.providers')}</button>
          <button type="button" className={apiFocus === 'models' ? styles.active : ''} onClick={() => setApiFocus('models')}>{t('settings.models')}</button>
        </div>
      </header>

      {apiFocus === 'providers' ? <ProvidersMobile context={context} /> : <ModelsMobile context={context} />}
    </section>
  );
}
