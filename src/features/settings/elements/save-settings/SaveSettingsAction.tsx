import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function SaveSettingsAction({ context }: ElementDefinitionProps<SettingsSaveActionContext>) {
  const { t } = useI18n();
  return <Button variant="primary" onClick={context.onSave} disabled={!context.isDirty}>{t('settings.save')}</Button>;
}
