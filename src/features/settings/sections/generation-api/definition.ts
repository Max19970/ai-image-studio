import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { GenerationApiSettingsSection } from './GenerationApiSettingsSection';

type GenerationApiSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

const definition: ElementDefinition<SettingsSectionContext, GenerationApiSettingsSectionProps> = {
  id: 'settingsSections.generationApi',
  label: 'Generation API settings section',
  Component: GenerationApiSettingsSection,
  defaultProps: {
    variant: 'desktop'
  }
};

export default definition;
