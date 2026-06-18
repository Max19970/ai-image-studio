import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from '../../sections/header/GalleryHeaderSection.module.css';

export function ClearResultsAction({ context }: ElementDefinitionProps<GalleryHeaderActionContext>) {
  const { t } = useI18n();
  return (
    <Button variant="ghost" tone="danger" size="compact" className={styles.clearResultsButton} onClick={context.commands.clearResults}>
      {t('gallery.clearResults')}
    </Button>
  );
}
