export type ProviderResourceKind = string & {};

export interface ProviderResourceDescriptor {
  kinds: readonly ProviderResourceKind[];
}

export interface ProviderResourceEntry {
  id: string;
  name: string;
  nativeName?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResourceList {
  kind: ProviderResourceKind;
  providerLabel: string;
  createdAt: number;
  items: ProviderResourceEntry[];
  warning?: string;
}
