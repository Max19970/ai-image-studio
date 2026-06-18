import type { SidebarTabContext, WorkspaceTab } from '../context/workspace/tabs';
import { useI18n } from '../../i18n';
import { NavigationButton } from '../../shared/ui/NavigationButton';

interface WorkspaceTabButtonProps {
  context: SidebarTabContext;
  tab: WorkspaceTab;
  icon: string;
  labelKey: string;
  titleKey?: string;
}

export function WorkspaceTabButton({ context, tab, icon, labelKey, titleKey = labelKey }: WorkspaceTabButtonProps) {
  const { t } = useI18n();
  const active = context.activeTab === tab;
  const selectTab = () => {
    context.onTabChange(tab);
    context.onAfterSelect?.();
  };

  if (context.variant === 'collapsed') {
    return (
      <NavigationButton
        active={active}
        aria-label={t(titleKey)}
        aria-current={active ? 'page' : undefined}
        data-workspace-tab={tab}
        icon={icon}
        onClick={selectTab}
        title={t(titleKey)}
        variant="rail"
      />
    );
  }

  return (
    <NavigationButton
      active={active}
      aria-current={active ? 'page' : undefined}
      data-workspace-tab={tab}
      icon={icon}
      onClick={selectTab}
      variant={context.variant === 'mobile' ? 'mobile' : tab === 'settings' ? 'card' : 'list'}
    >
      {t(labelKey)}
    </NavigationButton>
  );
}
