import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { cx } from '../../model/detailHelpers';
import { SnapshotSections } from '../snapshot/DetailSnapshotSections';
import styles from './DetailRequestDrawerSection.module.css';

export function DetailRequestDrawerSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  return (
    <div className={cx(styles.requestDrawer, context.requestOpen ? styles.open : styles.closed)} data-detail-slot="request-drawer">
      <SnapshotSections task={context.task} activeImage={context.activeImage} />
    </div>
  );
}
