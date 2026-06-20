import type { MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function HiresFixGalleryAction({ context }: ElementDefinitionProps<GalleryCardActionContext>) {
  const { t } = useI18n();
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    void context.onStartHiresFix();
  };

  return (
    <Button variant="ghost" size="compact" fullWidth data-gallery-action="hires-fix" onClick={handleClick}>
      {t('gallery.actionHiresFix')}
    </Button>
  );
}
