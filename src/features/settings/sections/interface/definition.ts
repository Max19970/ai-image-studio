import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

type InterfaceSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

const definition: ElementDefinition<SettingsSectionContext, InterfaceSettingsSectionProps> = {
  id: 'settingsSections.interface',
  label: 'Interface settings section',
  Component: lazyElementComponent(() => import('./InterfaceSettingsSection'), 'InterfaceSettingsSection'),
  defaultProps: {
    variant: 'desktop'
  }
};

export default definition;
