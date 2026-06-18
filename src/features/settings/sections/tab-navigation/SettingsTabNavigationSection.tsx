import { SlotHost } from '../../../../interface/SlotHost';
import type { SettingsTabContext } from '../../../../interface/context/workspace/tabs';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext, SettingsTab } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsTabNavigationSection({ context }: ElementDefinitionProps<SettingsLayoutZoneContext>) {
  const isMobile = context.variant === 'mobile';

  return (
    <SlotHost<SettingsTabContext<SettingsTab>>
      as={isMobile ? 'div' : 'aside'}
      slot="settings/tabs"
      context={{ activeTab: context.activeTab, variant: context.variant, onTabChange: context.setActiveTab }}
      className={isMobile ? styles.mobileTabs : styles.tabRail}
      dataTestId={isMobile ? 'settings-mobile-tabs' : 'settings-tab-rail'}
    />
  );
}
