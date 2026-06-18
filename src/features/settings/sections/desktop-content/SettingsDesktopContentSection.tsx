import { SlotHost } from '../../../../interface/SlotHost';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsDesktopContentSection({ context }: ElementDefinitionProps<SettingsLayoutZoneContext>) {
  return (
    <div className={`${styles.tabbedShell} glass-panel`} onClick={(event) => event.stopPropagation()}>
      <SlotHost<SettingsLayoutZoneContext> slot="settings/tab-navigation" context={context} as={null} />
      <SlotHost<SettingsLayoutZoneContext> slot="settings/active-section" context={context} as={null} />
    </div>
  );
}
