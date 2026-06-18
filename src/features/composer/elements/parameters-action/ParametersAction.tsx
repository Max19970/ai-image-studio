import { useI18n } from '../../../../i18n';
import { ActionIconButton } from '../../ui/ActionIconButton';
import type { ComposerActionContext } from '../../composerTypes';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function ParametersAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  return <ActionIconButton testId="composer-parameters" icon="⚙" label={t('composer.paramsTitle')} onClick={context.actions.openParameters} />;
}
