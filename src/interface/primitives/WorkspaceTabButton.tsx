import type { ReactNode } from 'react';
import type { SidebarTabContext, WorkspaceTab } from '../context/workspace/tabs';
import { useI18n } from '../../i18n';
import { NavigationButton } from '../../shared/ui';

interface WorkspaceTabButtonProps {
  context: SidebarTabContext;
  tab: WorkspaceTab;
  labelKey: string;
  titleKey?: string;
}

const WORKSPACE_TAB_ICONS: Record<WorkspaceTab, ReactNode> = {
  images: (
    <svg viewBox="0 0 20 20" fill="none" focusable="false">
      <rect x="2.75" y="3.25" width="14.5" height="13.5" rx="2.5" />
      <circle cx="13.2" cy="7.15" r="1.15" />
      <path d="m5.25 14 3.3-3.5 2.45 2.3 2-2.15 1.75 1.85" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="none" focusable="false">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 9.1v4.35" />
      <path d="M10 6.55h.01" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 20 20" fill="none" focusable="false">
      <path d="M3 5.25h5.25M11.75 5.25H17" />
      <path d="M3 10h2.25M8.75 10H17" />
      <path d="M3 14.75h7.25M13.75 14.75H17" />
      <circle cx="10" cy="5.25" r="1.75" />
      <circle cx="7" cy="10" r="1.75" />
      <circle cx="12" cy="14.75" r="1.75" />
    </svg>
  )
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
