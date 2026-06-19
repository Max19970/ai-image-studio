import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

type GenerationApiSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

const definition: ElementDefinition<SettingsSectionContext, GenerationApiSettingsSectionProps> = {
  id: 'settingsSections.generationApi',
  label: 'Generation API settings section',
  Component: lazyElementComponent(() => import('./GenerationApiSettingsSection'), 'GenerationApiSettingsSection'),
  defaultProps: {
    variant: 'desktop'
  }
};

export default definition;
