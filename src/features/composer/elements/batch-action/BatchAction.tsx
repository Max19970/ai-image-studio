import { useI18n } from '../../../../i18n';
import { ActionIconButton } from '../../ui/ActionIconButton';
import type { ComposerActionContext } from '../../composerTypes';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function BatchAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  return <ActionIconButton testId="composer-batch" icon="☷" label={t('batch.open')} onClick={context.actions.openBatchComposer} />;
}
