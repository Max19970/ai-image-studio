export type CapabilityKey =
  | 'model'
  | 'n'
  | 'size'
  | 'quality'
  | 'background'
  | 'moderation'
  | 'output_format'
  | 'output_compression'
  | 'stream'
  | 'partial_images'
  | 'response_format'
  | 'input_fidelity'
  | 'user'
  | 'style';

export interface CapabilityEntry {
  supported: boolean;
  status: 'accepted' | 'rejected' | 'error' | 'unknown';
  message?: string;
  testedValue?: unknown;
}

export interface ProviderProbeReport {
  fingerprint: string;
  createdAt: number;
  providerLabel: string;
  caveat?: string;
  baseline: {
    generation: CapabilityEntry;
    edit: CapabilityEntry;
    unknownParamControlGeneration?: CapabilityEntry;
    unknownParamControlEdit?: CapabilityEntry;
  };
  generation: Partial<Record<CapabilityKey, CapabilityEntry>>;
  edit: Partial<Record<CapabilityKey, CapabilityEntry>>;
}

export interface ProviderQuickCheckResult {
  ok: boolean;
  status: number | null;
  message: string;
  createdAt: number;
}
