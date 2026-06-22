import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';

export function DetailHiresFixAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();

  return (
    <Button
      variant="secondary"
      onClick={() => {
        void context.onStartHiresFix?.(context.activeImage);
      }}
    >
      {t('gallery.actionHiresFix')}
    </Button>
  );
}
