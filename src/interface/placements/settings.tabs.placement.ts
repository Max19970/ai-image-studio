import type { ElementPlacement } from '../registry/types';
import type { SettingsTabContext } from '../context/workspace/tabs';

type SettingsTab = 'interface' | 'generationApi' | 'integrations';

export default [
  {
    id: 'settings.tabs.interface',
    slot: 'settings/tabs',
    use: 'settings.tab',
    order: 10,
    props: {
      tab: 'interface',
      labelKey: 'settings.tab.interface',
      hintKey: 'settings.tab.interfaceHint'
    }
  },
  {
    id: 'settings.tabs.generation-api',
    slot: 'settings/tabs',
    use: 'settings.tab',
    order: 20,
    props: {
      tab: 'generationApi',
      labelKey: 'settings.tab.generationApi',
      hintKey: 'settings.tab.generationApiHint'
    },
    requiresFeature: 'providerProbing'
  },
  {
    id: 'settings.tabs.integrations',
    slot: 'settings/tabs',
    use: 'settings.tab',
    order: 30,
    props: {
      tab: 'integrations',
      labelKey: 'settings.tab.integrations',
      hintKey: 'settings.tab.integrationsHint'
    }
  }
] satisfies ElementPlacement<SettingsTabContext<SettingsTab>>[];
