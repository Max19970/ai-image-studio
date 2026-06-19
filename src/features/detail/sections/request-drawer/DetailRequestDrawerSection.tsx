import { useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { SideInspector } from '../../../../shared/ui';
import { cx } from '../../model/detailHelpers';
import { SnapshotSections } from '../snapshot/DetailSnapshotSections';
import type { DetailInspectorTab } from '../snapshot/DetailSnapshotSections';
import styles from './DetailRequestDrawerSection.module.css';

const tabs: DetailInspectorTab[] = ['prompt', 'params', 'files', 'technical'];

export function DetailRequestDrawerSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<DetailInspectorTab>('prompt');
  const snapshot = context.task.request;
  const title = context.task.batch ? t('detail.batchMeta') : t('detail.requestInspector');
  const description = snapshot.modelLabel || snapshot.model || t('detail.notSet');

  return (
    <SideInspector
      title={title}
      description={description}
      density="compact"
      sticky
      className={styles.inspector}
      data-detail-slot="request-drawer"
    >
      <nav className={styles.mobileTabs} aria-label={t('detail.inspectorTabs')}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cx(styles.tabButton, activeTab === tab && styles.active)}
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            data-testid={`detail-tab-${tab}`}
          >
            {t(`detail.tab.${tab}`)}
          </button>
        ))}
      </nav>
      <div className={styles.desktopSnapshot}>
        <SnapshotSections task={context.task} activeImage={context.activeImage} />
      </div>
      <div className={styles.mobileSnapshot}>
        <SnapshotSections task={context.task} activeImage={context.activeImage} activeMobileTab={activeTab} />
      </div>
    </SideInspector>
  );
}
