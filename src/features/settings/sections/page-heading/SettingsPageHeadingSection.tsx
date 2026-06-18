import { useI18n } from '../../../../i18n';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsPageHeadingSection({ context }: ElementDefinitionProps<SettingsLayoutZoneContext>) {
  const { t } = useI18n();

  if (context.variant === 'mobile') {
    return (
      <header className={styles.mobileHero}>
        <p className="section-kicker">{t('settings.kicker')}</p>
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.subtitle')}</p>
      </header>
    );
  }

  return (
    <header className={styles.pageHeading}>
      <p className="section-kicker">{t('settings.kicker')}</p>
      <h2>{t('settings.title')}</h2>
      <p>{t('settings.subtitle')}</p>
    </header>
  );
}
