import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from '../../sections/header/GalleryHeaderSection.module.css';

export function HistoryLinkAction(_: ElementDefinitionProps<GalleryHeaderActionContext>) {
  const { t } = useI18n();
  return <Button variant="ghost" size="compact" className={styles.historyButton}>↻ {t('gallery.history')}</Button>;
}
