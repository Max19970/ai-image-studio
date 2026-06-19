import type { ElementDefinition } from '../../../../interface/registry/types';
import type { SettingsTabContext } from '../../../../interface/context/workspace/tabs';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

type SettingsTabElementProps = {
  tab: string;
  labelKey: string;
  hintKey: string;
};

export default {
  id: 'settings.tab',
  label: 'Settings tab',
  Component: lazyElementComponent(() => import('./SettingsTabElement'), 'SettingsTabElement')
} satisfies ElementDefinition<SettingsTabContext<string>, SettingsTabElementProps>;
