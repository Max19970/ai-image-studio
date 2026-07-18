import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { locales, useI18n, type Locale } from '../../../../i18n';
import { ChevronRightIcon, PopoverSelect } from '../../../../shared/ui';
import { FieldShell, InfoTip } from '../../components/SettingsControls';
import selectStyles from '../../components/SettingsPopoverSelect.module.css';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { interfaceThemeDescriptors, themePreviewMeta, type InterfaceThemeDescriptor } from '../../themePreview';
import styles from './InterfaceSettingsSection.module.css';

type InterfaceSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

function themeClass(classKey: string | undefined): string {
  return classKey ? styles[classKey] ?? '' : '';
}

function ThemePreview({ theme }: { theme: InterfaceThemeDescriptor }) {
  return (
    <span className={`${styles.themePreview} ${themeClass(themePreviewMeta[theme.id].classKeys.preview)}`} aria-hidden="true">
      <span className={styles.themePreviewSidebar} />
      <span className={styles.themePreviewCanvas}>
        <i className={`${styles.themePreviewLine} ${styles.themePreviewLineStrong}`} />
        <i className={styles.themePreviewLine} />
        <i className={styles.themePreviewButton} />
      </span>
    </span>
  );
}

function ThemeButton({ theme, active, onSelect, showMeta }: { theme: InterfaceThemeDescriptor; active: boolean; onSelect: () => void; showMeta?: boolean }) {
  const { t } = useI18n();
  const meta = themePreviewMeta[theme.id];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`${styles.themeChoice} ${themeClass(meta.classKeys.choice)} ${active ? styles.themeChoiceActive : ''}`}
      onClick={onSelect}
    >
      <ThemePreview theme={theme} />
      <span className={styles.themeChoiceCopy}>
        <strong>{t(`settings.theme.${theme.id}.title`)}</strong>
        <span>{t(`settings.theme.${theme.id}.description`)}</span>
      </span>
      {showMeta ? (
        <span className={styles.themeChoiceMeta}>
          <span><i className={`${styles.themeAccentDot} ${themeClass(meta.classKeys.accent)}`} />{meta.accent}</span>
          <span>{meta.font}</span>
          <span>{t(`settings.theme.${theme.id}.tone`)}</span>
        </span>
      ) : null}
    </button>
  );
}

function StorageLimitInput({ id, value, onChange, ariaLabel }: { id: string; value: number; onChange: (value: number) => void; ariaLabel: string }) {
  return (
    <input
      id={id}
      className={styles.numberInput}
      type="number"
      min={1}
      max={10000}
      step={1}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

export function InterfaceSettingsSection({ context, props }: ElementDefinitionProps<SettingsSectionContext, InterfaceSettingsSectionProps>) {
  const { t } = useI18n();
  const {
    locale,
    setLocale,
    activeInfo,
    setActiveInfo,
    activeTheme,
    selectTheme,
    maxStoredGenerationTasks,
    setMaxStoredGenerationTasks
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

        <article className="mobile-card glass-panel">
          <div className="mobile-card-head">
            <div>
              <span className="section-kicker">{t('settings.storageTitle')}</span>
              <h3>{t('settings.storageLimitLabel')}</h3>
              <p>{t('settings.storageLimitHint')}</p>
            </div>
            <InfoTip id="mobileStorageLimit" text={t('settings.info.storageLimit')} activeId={activeInfo} onToggle={setActiveInfo} />
          </div>
          <StorageLimitInput id="mobile-storage-limit" value={maxStoredGenerationTasks} onChange={setMaxStoredGenerationTasks} ariaLabel={t('settings.storageLimitLabel')} />
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
            {interfaceThemeDescriptors.map((theme) => (
              <ThemeButton key={theme.id} theme={theme} active={activeTheme === theme.id} onSelect={() => selectTheme(theme.id)} />
            ))}
            <span className="mobile-theme-scroll-hint" aria-hidden="true">
              <ChevronRightIcon size={16} />
            </span>
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

      <div className={styles.storageCard}>
        <div>
          <p className="section-kicker">{t('settings.storageTitle')}</p>
          <p>{t('settings.storageLimitHint')}</p>
        </div>
        <FieldShell id="storageLimit" label={t('settings.storageLimitLabel')} info={t('settings.info.storageLimit')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
          <StorageLimitInput id="storage-limit" value={maxStoredGenerationTasks} onChange={setMaxStoredGenerationTasks} ariaLabel={t('settings.storageLimitLabel')} />
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
          {interfaceThemeDescriptors.map((theme) => (
            <ThemeButton key={theme.id} theme={theme} active={activeTheme === theme.id} onSelect={() => selectTheme(theme.id)} showMeta />
          ))}
        </div>
      </div>
    </div>
  );
}
