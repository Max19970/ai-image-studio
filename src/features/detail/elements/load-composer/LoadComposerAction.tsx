import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function LoadComposerAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();
  return <Button variant="primary" onClick={() => context.onRestoreRequest?.(context.snapshot)}>{t('detail.loadComposer')}</Button>;
}
