import { useI18n } from '../../i18n';
import styles from './StudioInfoPage.module.css';

type Props = Record<string, never>;

const guideIds = ['generate', 'edit', 'batch', 'details', 'providers', 'probe'] as const;
type GuideId = typeof guideIds[number];

function GuideLink({ guide, index }: { guide: GuideId; index: number }) {
  const { t } = useI18n();
  const number = String(index + 1).padStart(2, '0');
  return (
    <a className={styles.guideLink} href={`#info-guide-${guide}`}>
      <span>{number}</span>
      <strong>{t(`info.guide.${guide}.title`)}</strong>
    </a>
  );
}

function GuideArticle({ guide, index }: { guide: GuideId; index: number }) {
  const { t } = useI18n();
  const number = String(index + 1).padStart(2, '0');
  return (
    <article id={`info-guide-${guide}`} className={styles.guideArticle}>
      <div className={styles.guideArticleHeader}>
        <span className={styles.guideNumber}>{number}</span>
        <div>
          <h3>{t(`info.guide.${guide}.title`)}</h3>
          <p>{t(`info.guide.${guide}.text`)}</p>
        </div>
      </div>
      <ol className={styles.steps}>
        <li>{t(`info.guide.${guide}.step1`)}</li>
        <li>{t(`info.guide.${guide}.step2`)}</li>
        <li>{t(`info.guide.${guide}.step3`)}</li>
      </ol>
    </article>
  );
}

export function StudioInfoPage(_: Props) {
  const { t } = useI18n();

  return (
    <section className={`${styles.page} workspace-info-page`} data-testid="info-page">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="section-kicker">{t('info.kicker')}</p>
          <h2>{t('info.title')}</h2>
          <p>{t('info.text')}</p>
        </div>
      </header>

      <section className={styles.quickSection} aria-labelledby="info-quick-title">
        <div className={styles.sectionIntro}>
          <p className="section-kicker">{t('info.quickKicker')}</p>
          <h3 id="info-quick-title">{t('info.quickTitle')}</h3>
          <p>{t('info.quickText')}</p>
        </div>
        <div className={styles.quickList}>
          <article className={styles.quickItem}>
            <strong>{t('info.quick.model.title')}</strong>
            <p>{t('info.quick.model.text')}</p>
          </article>
          <article className={styles.quickItem}>
            <strong>{t('info.quick.images.title')}</strong>
            <p>{t('info.quick.images.text')}</p>
          </article>
          <article className={styles.quickItem}>
            <strong>{t('info.quick.trace.title')}</strong>
            <p>{t('info.quick.trace.text')}</p>
          </article>
        </div>
      </section>

      <section className={styles.guidesWorkspace} aria-labelledby="info-guides-title">
        <aside className={styles.guideRail}>
          <p className="section-kicker">{t('info.guidesKicker')}</p>
          <h3 id="info-guides-title">{t('info.guidesTitle')}</h3>
          <p>{t('info.guidesText')}</p>
          <nav className={styles.guideNav} aria-label={t('info.guidesTitle')}>
            {guideIds.map((guide, index) => <GuideLink key={guide} guide={guide} index={index} />)}
          </nav>
        </aside>

        <div className={styles.guideStack}>
          {guideIds.map((guide, index) => <GuideArticle key={guide} guide={guide} index={index} />)}
        </div>
      </section>
    </section>
  );
}
