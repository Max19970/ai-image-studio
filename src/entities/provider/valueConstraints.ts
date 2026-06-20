import type {
  ProviderGenerationModeDefinition,
  ProviderImageSizeConstraint,
  ProviderNumericSnapMode,
  ProviderNumericValueConstraint
} from '../../domain/providerMode';

export interface ResolvedImageSize {
  width: number;
  height: number;
}

export interface ResolvedNumberValue {
  value: number;
}

export const defaultImageSizeConstraint: ProviderImageSizeConstraint = {
  min: 1,
  max: 4096,
  multipleOf: 8,
  snap: 'floor'
};

function finiteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, step: number, mode: ProviderNumericSnapMode): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const scaled = value / step;
  if (mode === 'ceil') return Math.ceil(scaled) * step;
  if (mode === 'round') return Math.round(scaled) * step;
  return Math.floor(scaled) * step;
}

export function resolveNumberConstraintValue(value: unknown, constraint: ProviderNumericValueConstraint, fallback = constraint.min): ResolvedNumberValue {
  const raw = clamp(finiteNumber(value, fallback), constraint.min, constraint.max);
  const step = constraint.step ?? 0;
  const snapped = step > 0 ? snapToStep(raw, step, constraint.snap ?? 'floor') : raw;
  const safe = clamp(snapped, constraint.min, constraint.max);
  return { value: Number(safe.toFixed(6)) };
}

export function getModeImageSizeConstraint(providerMode?: ProviderGenerationModeDefinition | null): ProviderImageSizeConstraint {
  return providerMode?.valueConstraints?.imageSize ?? defaultImageSizeConstraint;
}

export function resolveImageSizeConstraintValue(
  width: unknown,
  height: unknown,
  constraint: ProviderImageSizeConstraint = defaultImageSizeConstraint,
  fallback: ResolvedImageSize = { width: 1024, height: 1024 }
): ResolvedImageSize {
  const mode = constraint.snap ?? 'floor';
  const step = constraint.multipleOf ?? 0;
  const resolveSide = (value: unknown, fallbackSide: number) => {
    const raw = clamp(finiteNumber(value, fallbackSide), constraint.min, constraint.max);
    const snapped = step > 0 ? snapToStep(raw, step, mode) : raw;
    return Math.round(clamp(snapped, constraint.min, constraint.max));
  };

  return {
    width: resolveSide(width, fallback.width),
    height: resolveSide(height, fallback.height)
  };
}

export function resolveModeImageSize(
  width: unknown,
  height: unknown,
  providerMode?: ProviderGenerationModeDefinition | null,
  fallback?: ResolvedImageSize
): ResolvedImageSize {
  return resolveImageSizeConstraintValue(width, height, getModeImageSizeConstraint(providerMode), fallback);
}

export function resolveModeHiresScale(value: unknown, providerMode?: ProviderGenerationModeDefinition | null): number {
  const constraint = providerMode?.valueConstraints?.hiresScale ?? { min: 0.1, max: 8, step: 0.01, snap: 'floor' as const };
  return resolveNumberConstraintValue(value, constraint, 2).value;
}

export function describeResolvedSizeChange(raw: ResolvedImageSize, resolved: ResolvedImageSize): string | null {
  if (raw.width === resolved.width && raw.height === resolved.height) return null;
  return `${raw.width}×${raw.height} → ${resolved.width}×${resolved.height}`;
}
