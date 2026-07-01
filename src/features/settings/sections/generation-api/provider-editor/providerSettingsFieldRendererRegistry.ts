import { providerSettingsFieldRendererFallbackModules } from './providerSettingsFieldRenderers.generated';
import type { ProviderSettingsFieldRendererDescriptor } from './providerSettingsFieldRendererTypes';

type FieldRendererModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, FieldRendererModule>;
};

const discoveredRendererModules = (import.meta as ImportMetaWithGlob).glob?.('./field-renderers/*.fieldRenderer.tsx', { eager: true }) ?? {};
const rendererModules = {
  ...providerSettingsFieldRendererFallbackModules,
  ...discoveredRendererModules
} as Record<string, FieldRendererModule>;

function isProviderSettingsFieldRendererDescriptor(value: unknown): value is ProviderSettingsFieldRendererDescriptor {
  const candidate = value as Partial<ProviderSettingsFieldRendererDescriptor> | null;
  return Boolean(candidate?.kind && typeof candidate.render === 'function');
}

export const providerSettingsFieldRenderers = Object.values(rendererModules)
  .flatMap((module) => Object.values(module).filter(isProviderSettingsFieldRendererDescriptor));

export const providerSettingsFieldRenderersByKind = new Map(
  providerSettingsFieldRenderers.map((renderer) => [renderer.kind, renderer] as const)
);
