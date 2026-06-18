import type { ComponentType } from 'react';
import type { FeatureRequirement } from '../../shared/features';
import type { CapabilityRequirement } from '../registry/capabilityFilters';

export interface SlotContributionProps<TContext = unknown> {
  context: TContext;
  slot: string;
}

export interface SlotContribution<TContext = unknown> {
  id?: string;
  label?: string;
  order?: number;
  slot?: string;
  Component: ComponentType<SlotContributionProps<TContext>>;
  enabled?: (context: TContext) => boolean;
  requiresFeature?: FeatureRequirement;
  requiresCapability?: CapabilityRequirement;
}

export interface ResolvedSlotContribution<TContext = unknown> extends SlotContribution<TContext> {
  id: string;
  order: number;
  slot: string;
  sourcePath: string;
}
