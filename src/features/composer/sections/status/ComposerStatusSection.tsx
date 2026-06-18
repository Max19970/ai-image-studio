import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import styles from '../../ComposerLayout.module.css';

export function ComposerStatusSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();

  if (!context.statusText && !(context.mode === 'edit' && !context.targetImage)) return null;

  return (
    <div className={styles.statusRow} data-composer-slot="status">
      {context.statusText && <p className={`${styles.note} ${styles.noteStrong}`}>{context.statusText}</p>}
      {context.mode === 'edit' && !context.targetImage && <p className={styles.note}>{t('composer.editNeedsTarget')}</p>}
    </div>
  );
}
