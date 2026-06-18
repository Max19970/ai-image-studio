import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsTabContext } from '../../../../interface/context/workspace/tabs';
import { SettingsTabElement } from './SettingsTabElement';

type SettingsTabElementProps = {
  tab: string;
  labelKey: string;
  hintKey: string;
};

export default {
  id: 'settings.tab',
  label: 'Settings tab',
  Component: SettingsTabElement
} satisfies ElementDefinition<SettingsTabContext<string>, SettingsTabElementProps>;
