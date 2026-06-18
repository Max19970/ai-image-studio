import { SlotHost } from '../../../../interface/SlotHost';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext, SettingsSectionContext } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsActiveSection({ context }: ElementDefinitionProps<SettingsLayoutZoneContext>) {
  const sectionContext: SettingsSectionContext = { ...context.sectionContext, variant: context.variant };

  if (context.variant === 'desktop') {
    return (
      <section className={styles.tabPage}>
        <SlotHost<SettingsSectionContext>
          slot="settings/sections"
          context={sectionContext}
          as={null}
        />
      </section>
    );
  }

  return (
    <SlotHost<SettingsSectionContext>
      slot="settings/sections"
      context={sectionContext}
      as={null}
    />
  );
}
