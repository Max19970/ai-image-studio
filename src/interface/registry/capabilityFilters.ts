import type { CapabilityKey, ProviderProbeReport } from '../../domain/providerProbe';
import type { WorkMode } from '../../domain/workMode';
import { isProviderCapabilitySupported } from '../../entities/provider';

export type CapabilityRequirement =
  | CapabilityKey
  | CapabilityRequirementDescriptor
  | Array<CapabilityKey | CapabilityRequirementDescriptor>;

export interface CapabilityRequirementDescriptor {
  key: CapabilityKey;
  mode?: WorkMode;
  /**
   * When a host context has no capability information, placements stay visible by default.
   * This keeps optional probes non-blocking and mirrors provider helpers where missing probe
   * entries are treated as unknown-but-not-disabled.
   */
  fallback?: boolean;
}

type CapabilityContext = {
  mode?: WorkMode;
  capabilityReport?: ProviderProbeReport | null;
};

const knownNestedCapabilityKeys = [
  'capability',
  'capabilities',
  'info',
  'settings',
  'singleParameters',
  'batchParameters'
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkMode(value: unknown): value is WorkMode {
  return value === 'generate' || value === 'edit';
}

function hasCapabilityShape(context: Record<string, unknown>): boolean {
  return 'mode' in context || 'capabilityReport' in context || 'report' in context;
}

function extractDirectCapabilityContext(context: Record<string, unknown>): CapabilityContext | null {
  if (!hasCapabilityShape(context)) return null;

  const mode = isWorkMode(context.mode) ? context.mode : undefined;
  const capabilityReport = 'capabilityReport' in context
    ? context.capabilityReport as ProviderProbeReport | null | undefined
    : 'report' in context
      ? context.report as ProviderProbeReport | null | undefined
      : undefined;

  return { mode, capabilityReport: capabilityReport ?? null };
}

function extractCapabilityContext(context: unknown, depth = 0): CapabilityContext | null {
  if (!isObject(context) || depth > 2) return null;

  const direct = extractDirectCapabilityContext(context);
  if (direct) return direct;

  // Do not recursively walk arbitrary objects: slot contexts may contain refs, files, or DOM nodes.
  // Only inspect known capability-aware subcontexts.
  for (const key of knownNestedCapabilityKeys) {
    if (!(key in context)) continue;
    const nested = extractCapabilityContext(context[key], depth + 1);
    if (nested) return nested;
  }

  return null;
}

function normalizeRequirement(requirement: CapabilityKey | CapabilityRequirementDescriptor): Required<CapabilityRequirementDescriptor> {
  if (typeof requirement === 'string') {
    return { key: requirement, mode: 'generate', fallback: true };
  }
  return {
    key: requirement.key,
    mode: requirement.mode ?? 'generate',
    fallback: requirement.fallback ?? true
  };
}

export function isCapabilitySatisfied(requiredCapability: CapabilityRequirement | undefined, context?: unknown): boolean {
  if (!requiredCapability) return true;

  const requirements = Array.isArray(requiredCapability) ? requiredCapability : [requiredCapability];
  const capabilityContext = extractCapabilityContext(context);

  return requirements.every((rawRequirement) => {
    const requirement = normalizeRequirement(rawRequirement);
    const mode = capabilityContext?.mode ?? requirement.mode;

    if (!capabilityContext) return requirement.fallback;
    return isProviderCapabilitySupported(capabilityContext.capabilityReport ?? null, mode, requirement.key);
  });
}

export function getCapabilityContextForDebug(context: unknown): CapabilityContext | null {
  return extractCapabilityContext(context);
}
