import { integrationPanelFallbackModules } from './integrationPanels.generated';
import type { IntegrationSettingsPanelDescriptor } from './integrationPanelTypes';

export type { IntegrationSettingsPanelDescriptor, IntegrationSettingsPanelProps } from './integrationPanelTypes';

type PanelModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, PanelModule>;
};

const discoveredPanelModules = (import.meta as ImportMetaWithGlob).glob?.('./*.panel.tsx', { eager: true }) ?? {};
const panelModules = {
  ...integrationPanelFallbackModules,
  ...discoveredPanelModules
} as Record<string, PanelModule>;

function isPanelDescriptor(value: unknown): value is IntegrationSettingsPanelDescriptor {
  const candidate = value as Partial<IntegrationSettingsPanelDescriptor> | null;
  return Boolean(candidate?.integrationId && candidate.Component);
}

export const integrationSettingsPanelDescriptors = Object.values(panelModules).flatMap((module) => Object.values(module).filter(isPanelDescriptor));
export const integrationSettingsPanelDescriptorsById = new Map(integrationSettingsPanelDescriptors.map((descriptor) => [descriptor.integrationId, descriptor]));
