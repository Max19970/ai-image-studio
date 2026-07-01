import type { HostEnvironmentDescriptor, HostImageFileTransport } from './types';

type HostEnvironmentModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, HostEnvironmentModule>;
};

const discoveredHostEnvironmentModules = ((import.meta as ImportMetaWithGlob).glob?.('../../integrations/*/hostEnvironment.ts', { eager: true }) ?? {}) as Record<string, HostEnvironmentModule>;

function isHostEnvironmentDescriptor(value: unknown): value is HostEnvironmentDescriptor {
  const candidate = value as Partial<HostEnvironmentDescriptor> | null;
  return Boolean(candidate?.id && typeof candidate.useState === 'function');
}

export const hostEnvironmentDescriptors = Object.entries(discoveredHostEnvironmentModules)
  .flatMap(([sourcePath, module]) =>
    Object.values(module)
      .filter(isHostEnvironmentDescriptor)
      .map((descriptor) => ({ descriptor, sourcePath }))
  )
  .sort((a, b) => (a.descriptor.order ?? 1000) - (b.descriptor.order ?? 1000) || a.descriptor.id.localeCompare(b.descriptor.id) || a.sourcePath.localeCompare(b.sourcePath))
  .map(({ descriptor }) => descriptor);

export const hostImageFileTransports = hostEnvironmentDescriptors
  .flatMap((descriptor) => descriptor.imageFileTransport ? [descriptor.imageFileTransport] : [])
  .sort((a, b) => a.id.localeCompare(b.id));

export function getActiveHostImageFileTransport(): HostImageFileTransport | null {
  return hostImageFileTransports.find((transport) => transport.isAvailable()) ?? null;
}
