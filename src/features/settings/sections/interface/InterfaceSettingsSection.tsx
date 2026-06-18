import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { locales, useI18n, type Locale } from '../../../../i18n';
import { PopoverSelect } from '../../../../shared/ui';
import { FieldShell, InfoTip } from '../../components/SettingsControls';
import selectStyles from '../../components/SettingsPopoverSelect.module.css';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { interfaceThemes, themePreviewMeta } from '../../themePreview';
import styles from './InterfaceSettingsSection.module.css';


const themeChoiceClass = {
  glass: styles.themeChoiceGlass,
  midnight: styles.themeChoiceMidnight,
  ember: styles.themeChoiceEmber,
  meadow: styles.themeChoiceMeadow,
  mono: styles.themeChoiceMono
} as const;

const themePreviewClass = {
  glass: styles.themeSwatchGlass,
  midnight: styles.themeSwatchMidnight,
  ember: styles.themeSwatchEmber,
  meadow: styles.themeSwatchMeadow,
  mono: styles.themeSwatchMono
} as const;

const themeAccentClass = {
  glass: styles.themeAccentGlass,
  midnight: styles.themeAccentMidnight,
  ember: styles.themeAccentEmber,
  meadow: styles.themeAccentMeadow,
  mono: styles.themeAccentMono
} as const;

type InterfaceSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

export function InterfaceSettingsSection({ context, props }: ElementDefinitionProps<SettingsSectionContext, InterfaceSettingsSectionProps>) {
  const { t } = useI18n();
  const {
    locale,
    setLocale,
    activeInfo,
    setActiveInfo,
    activeTheme,
    selectTheme
  } = context;

  if (props.variant === 'mobile') {
    return (
      <section className="mobile-settings-stack" data-settings-section="interface" data-settings-variant="mobile">
        <article className="mobile-card mobile-language-card glass-panel">
          <div className="mobile-card-head">
            <div>
              <span className="section-kicker">{t('settings.languageTitle')}</span>
              <h3>{t('settings.languageLabel')}</h3>
              <p>{t('settings.languageHint')}</p>
            </div>
            <InfoTip id="mobileLanguage" text={t('settings.info.language')} activeId={activeInfo} onToggle={setActiveInfo} />
          </div>
          <PopoverSelect
            value={locale}
            onChange={(value) => setLocale(value as Locale)}
            options={locales.map((item) => ({ value: item.value, label: item.nativeLabel, description: item.label }))}
            ariaLabel={t('settings.languageLabel')}
            className={selectStyles.root}
            triggerClassName={selectStyles.trigger}
            panelClassName={selectStyles.panel}
            showSelectedDescription
          />
        </article>

        <article className="mobile-card mobile-theme-card glass-panel">
          <div className="mobile-card-head">
            <div>
              <span className="section-kicker">{t('settings.themeTitle')}</span>
              <h3>{t('settings.themeHeading')}</h3>
              <p>{t('settings.themeHint')}</p>
            </div>
            <InfoTip id="mobileInterfaceTheme" text={t('settings.info.theme')} activeId={activeInfo} onToggle={setActiveInfo} />
          </div>
          <div className="mobile-theme-strip" role="radiogroup" aria-label={t('settings.themeTitle')}>
            {interfaceThemes.map((theme) => (
              <button
                type="button"
                key={theme}
                role="radio"
                aria-checked={activeTheme === theme}
                className={`${styles.themeChoice} ${themeChoiceClass[theme]} ${activeTheme === theme ? styles.themeChoiceActive : ''}`}
                onClick={() => selectTheme(theme)}
              >
                <span className={`${styles.themePreview} ${themePreviewClass[theme]}`} aria-hidden="true">
                  <span className={styles.themePreviewSidebar} />
                  <span className={styles.themePreviewCanvas}>
                    <i className={`${styles.themePreviewLine} ${styles.themePreviewLineStrong}`} />
                    <i className={styles.themePreviewLine} />
                    <i className={styles.themePreviewButton} />
                  </span>
                </span>
                <span className={styles.themeChoiceCopy}>
                  <strong>{t(`settings.theme.${theme}.title`)}</strong>
                  <span>{t(`settings.theme.${theme}.description`)}</span>
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>
    );
  }

  return (
    <div className={styles.subpage} data-settings-section="interface" data-settings-variant="desktop">
      <div className={styles.pageHeading}>
        <p className="section-kicker">{t('settings.tab.interface')}</p>
        <h3>{t('settings.interfaceTitle')}</h3>
        <p>{t('settings.interfaceText')}</p>
      </div>

      <div className={styles.languageCard}>
        <div>
          <p className="section-kicker">{t('settings.languageTitle')}</p>
          <p>{t('settings.languageHint')}</p>
        </div>
        <FieldShell id="language" label={t('settings.languageLabel')} info={t('settings.info.language')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
          <PopoverSelect
            value={locale}
            onChange={(value) => setLocale(value as Locale)}
            options={locales.map((item) => ({ value: item.value, label: item.nativeLabel, description: item.label }))}
            ariaLabel={t('settings.languageLabel')}
            className={selectStyles.root}
            triggerClassName={selectStyles.trigger}
            panelClassName={selectStyles.panel}
            showSelectedDescription
          />
        </FieldShell>
      </div>

      <div className={styles.themeCard}>
        <div className={styles.themeHead}>
          <div>
            <p className="section-kicker">{t('settings.themeTitle')}</p>
            <h4>{t('settings.themeHeading')}</h4>
            <p>{t('settings.themeHint')}</p>
          </div>
          <InfoTip id="interfaceTheme" text={t('settings.info.theme')} activeId={activeInfo} onToggle={setActiveInfo} />
        </div>

        <div className={styles.themeGrid} role="radiogroup" aria-label={t('settings.themeTitle')}>
          {interfaceThemes.map((theme) => (
            <button
              type="button"
              key={theme}
              role="radio"
              aria-checked={activeTheme === theme}
              className={`${styles.themeChoice} ${themeChoiceClass[theme]} ${activeTheme === theme ? styles.themeChoiceActive : ''}`}
              onClick={() => selectTheme(theme)}
            >
              <span className={`${styles.themePreview} ${themePreviewClass[theme]}`} aria-hidden="true">
                <span className={styles.themePreviewSidebar} />
                <span className={styles.themePreviewCanvas}>
                  <i className={`${styles.themePreviewLine} ${styles.themePreviewLineStrong}`} />
                  <i className={styles.themePreviewLine} />
                  <i className={styles.themePreviewButton} />
                </span>
              </span>
              <span className={styles.themeChoiceCopy}>
                <strong>{t(`settings.theme.${theme}.title`)}</strong>
                <span>{t(`settings.theme.${theme}.description`)}</span>
              </span>
              <span className={styles.themeChoiceMeta}>
                <span><i className={`${styles.themeAccentDot} ${themeAccentClass[theme]}`} />{themePreviewMeta[theme].accent}</span>
                <span>{themePreviewMeta[theme].font}</span>
                <span>{t(`settings.theme.${theme}.tone`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
