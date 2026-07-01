import { settingsSectionDescriptors } from '../../features/settings/sections/sectionRegistry';
import type { ElementPlacement } from '../registry/types';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../features/settings/settingsTypes';

const sectionVariants: readonly SettingsSectionVariant[] = ['desktop', 'mobile'];

export const placements: ElementPlacement<SettingsSectionContext>[] = settingsSectionDescriptors.flatMap((descriptor) =>
  sectionVariants.map((variant) => ({
    id: `settings.sections.${descriptor.id}.${variant}`,
    slot: 'settings/sections',
    use: descriptor.elementUse,
    order: descriptor.order,
    props: { variant },
    enabled: (context) => context.activeTab === descriptor.tab && context.variant === variant,
    requiresFeature: descriptor.requiresFeature
  }))
);
