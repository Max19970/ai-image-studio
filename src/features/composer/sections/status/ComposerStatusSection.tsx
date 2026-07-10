import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import styles from '../../ComposerLayout.module.css';

export function ComposerStatusSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  if (!context.statusText && !context.blockedReason) return null;

  return (
    <div className={styles.statusRow} data-composer-slot="status">
      {context.statusText && <p className={`${styles.note} ${styles.noteStrong}`}>{context.statusText}</p>}
      {context.blockedReason && (
        <p id="composer-submit-blocked-reason" className={styles.blockedReason} role="status">{context.blockedReason}</p>
      )}
    </div>
  );
}
