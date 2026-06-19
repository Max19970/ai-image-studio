import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

type IntegrationsSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

const definition: ElementDefinition<SettingsSectionContext, IntegrationsSettingsSectionProps> = {
  id: 'settingsSections.integrations',
  label: 'Integrations settings section',
  Component: lazyElementComponent(() => import('./IntegrationsSettingsSection'), 'IntegrationsSettingsSection'),
  defaultProps: {
    variant: 'desktop'
  }
};

export default definition;
