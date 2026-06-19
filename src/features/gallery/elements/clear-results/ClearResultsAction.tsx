import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from '../../sections/header/GalleryHeaderSection.module.css';

export function ClearResultsAction({ context }: ElementDefinitionProps<GalleryHeaderActionContext>) {
  const { t } = useI18n();
  const clearResults = () => {
    const count = context.tasks.length;
    if (count > 0 && !window.confirm(t('gallery.clearResultsConfirm', { count }))) return;
    context.commands.clearResults();
  };

  return (
    <Button
      variant="ghost"
      tone="danger"
      size="compact"
      className={styles.clearResultsButton}
      onClick={clearResults}
      aria-label={t('gallery.clearResultsAccessible')}
      title={t('gallery.clearResultsAccessible')}
    >
      {t('gallery.clearResults')}
    </Button>
  );
}
