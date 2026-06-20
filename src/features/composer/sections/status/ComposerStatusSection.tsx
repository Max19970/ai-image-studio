import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import styles from '../../ComposerLayout.module.css';

export function ComposerStatusSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  if (!context.statusText) return null;

  return (
    <div className={styles.statusRow} data-composer-slot="status">
      <p className={`${styles.note} ${styles.noteStrong}`}>{context.statusText}</p>
    </div>
  );
}
