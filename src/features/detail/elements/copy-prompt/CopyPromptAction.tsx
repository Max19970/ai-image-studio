import { useI18n } from '../../../../i18n';
import { copyText } from '../../../../domain/clipboard';
import { Button } from '../../../../shared/ui';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function CopyPromptAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();
  return <Button variant="secondary" onClick={() => copyText(context.snapshot.prompt)}>{t('detail.copyPrompt')}</Button>;
}
