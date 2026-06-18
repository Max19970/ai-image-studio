import { useI18n } from '../../../../i18n';
import type { SettingsTabContext } from '../../../../interface/context/workspace/tabs';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

type SettingsTabElementProps = {
  tab: string;
  labelKey: string;
  hintKey: string;
};

export function SettingsTabElement({ context, props }: ElementDefinitionProps<SettingsTabContext<string>, SettingsTabElementProps>) {
  const { t } = useI18n();
  const active = context.activeTab === props.tab;

  if (context.variant === 'mobile') {
    return (
      <button type="button" className={active ? 'active' : ''} onClick={() => context.onTabChange(props.tab)}>
        <strong>{t(props.labelKey)}</strong>
        <span>{t(props.hintKey)}</span>
      </button>
    );
  }

  return (
    <button type="button" className={active ? 'active' : ''} onClick={() => context.onTabChange(props.tab)}>
      <span>{t(props.labelKey)}</span>
      <small>{t(props.hintKey)}</small>
    </button>
  );
}
