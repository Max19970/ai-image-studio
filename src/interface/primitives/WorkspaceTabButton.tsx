import type { ReactNode } from 'react';
import type { SidebarTabContext, WorkspaceTab } from '../context/workspace/tabs';
import { useI18n } from '../../i18n';
import { ImagesIcon, InfoIcon, NavigationButton, SlidersHorizontalIcon } from '../../shared/ui';

interface WorkspaceTabButtonProps {
  context: SidebarTabContext;
  tab: WorkspaceTab;
  labelKey: string;
  titleKey?: string;
}

const WORKSPACE_TAB_ICONS: Record<WorkspaceTab, ReactNode> = {
  images: <ImagesIcon size={20} />,
  info: <InfoIcon size={20} />,
  settings: <SlidersHorizontalIcon size={20} />
};

export function WorkspaceTabButton({ context, tab, labelKey, titleKey = labelKey }: WorkspaceTabButtonProps) {
  const { t } = useI18n();
  const active = context.activeTab === tab;
  const collapsed = context.variant === 'collapsed';
  const label = t(labelKey);
  const selectTab = () => {
    context.onTabChange(tab);
    context.onAfterSelect?.();
  };
  const variant = context.variant === 'bottom'
    ? 'bottom'
    : context.variant === 'mobile'
      ? 'mobile'
      : 'list';

  return (
    <NavigationButton
      active={active}
      aria-label={collapsed ? t(titleKey) : undefined}
      aria-current={active ? 'page' : undefined}
      data-workspace-tab={tab}
      icon={WORKSPACE_TAB_ICONS[tab]}
      onClick={selectTab}
      title={collapsed ? t(titleKey) : undefined}
      variant={variant}
    >
      {label}
    </NavigationButton>
  );
}
