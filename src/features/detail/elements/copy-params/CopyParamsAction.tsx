import { useI18n } from '../../../../i18n';
import { copyText } from '../../../../domain/clipboard';
import { sentParameters } from '../.././sentParameters';
import { Button } from '../../../../shared/ui';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function CopyParamsAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();
  return <Button variant="secondary" onClick={() => copyText(JSON.stringify(sentParameters(context.snapshot, t), null, 2))}>{t('detail.copyParams')}</Button>;
}
