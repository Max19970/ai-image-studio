import { useI18n } from '../../../../i18n';
import { copyText } from '../../../../domain/clipboard';
import { Button } from '../../../../shared/ui';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function CopyPayloadAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();
  return <Button variant="secondary" onClick={() => copyText(JSON.stringify(context.snapshot.payload, null, 2))}>{context.isBatchSnapshot ? t('detail.copyBatchPayload') : t('detail.copyPayload')}</Button>;
}
