import { SlotHost } from '../../../../interface/SlotHost';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutContext, SettingsLayoutZoneContext } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsLayoutRootSection({ context }: ElementDefinitionProps<SettingsLayoutContext>) {
  const desktopContext: SettingsLayoutZoneContext = { ...context, variant: 'desktop' };
  const mobileContext: SettingsLayoutZoneContext = { ...context, variant: 'mobile' };

  return (
    <>
      <div className={styles.desktopView}>
        <SlotHost<SettingsLayoutZoneContext> slot="settings/header" context={desktopContext} as={null} />
        <SlotHost<SettingsLayoutZoneContext> slot="settings/save-bar" context={desktopContext} as={null} />
        <SlotHost<SettingsLayoutZoneContext> slot="settings/content" context={desktopContext} as={null} />
      </div>

      <div className={styles.mobileView} onClick={(event) => event.stopPropagation()}>
        <SlotHost<SettingsLayoutZoneContext> slot="settings/header" context={mobileContext} as={null} />
        <SlotHost<SettingsLayoutZoneContext> slot="settings/tab-navigation" context={mobileContext} as={null} />
        <SlotHost<SettingsLayoutZoneContext> slot="settings/save-bar" context={mobileContext} as={null} />
        <SlotHost<SettingsLayoutZoneContext> slot="settings/active-section" context={mobileContext} as={null} />
      </div>
    </>
  );
}
