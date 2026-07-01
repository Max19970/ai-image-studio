import { settingsSectionDescriptorFallbackModules } from './sectionDescriptors.generated';
import type { SettingsSectionDescriptor } from './sectionDescriptorTypes';

type SettingsSectionDescriptorModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, SettingsSectionDescriptorModule>;
};

const discoveredSectionDescriptorModules = (import.meta as ImportMetaWithGlob).glob?.('./*/sectionDescriptor.ts', { eager: true }) ?? {};
const sectionDescriptorModules = {
  ...settingsSectionDescriptorFallbackModules,
  ...discoveredSectionDescriptorModules
} as Record<string, SettingsSectionDescriptorModule>;

function isSettingsSectionDescriptor(value: unknown): value is SettingsSectionDescriptor {
  const candidate = value as Partial<SettingsSectionDescriptor> | null;
  return Boolean(candidate?.id && candidate.tab && candidate.elementUse && typeof candidate.order === 'number' && candidate.labelKey && candidate.hintKey);
}

const settingsSectionDescriptorsBySource = Object.entries(sectionDescriptorModules)
  .flatMap(([sourcePath, module]) => Object.values(module).filter(isSettingsSectionDescriptor).map((descriptor) => ({ descriptor, sourcePath })))
  .reduce((byId, item) => byId.set(item.descriptor.id, item), new Map<string, { descriptor: SettingsSectionDescriptor; sourcePath: string }>());

export const settingsSectionDescriptors: readonly SettingsSectionDescriptor[] = Array.from(settingsSectionDescriptorsBySource.values())
  .sort((a, b) => a.descriptor.order - b.descriptor.order || a.descriptor.id.localeCompare(b.descriptor.id) || a.sourcePath.localeCompare(b.sourcePath))
  .map(({ descriptor }) => descriptor);

export const settingsSectionDescriptorsById = new Map(settingsSectionDescriptors.map((descriptor) => [descriptor.id, descriptor] as const));
