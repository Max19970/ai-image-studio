import type { ComponentType } from 'react';
import type { FeatureRequirement } from '../../shared/features';
import type { CapabilityRequirement } from './capabilityFilters';
import type { SlotContributionProps } from '../slots/types';

export interface ElementDefinitionProps<TContext = unknown, TProps extends Record<string, unknown> = Record<string, unknown>> extends SlotContributionProps<TContext> {
  placement: ResolvedElementPlacement<TProps>;
  props: TProps;
}

export interface ElementDefinition<TContext = unknown, TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  label?: string;
  Component: ComponentType<ElementDefinitionProps<TContext, TProps>>;
  defaultProps?: Partial<TProps>;
  enabled?: (context: TContext, props: TProps) => boolean;
  sourcePath?: string;
}

export interface ElementPlacement<TInputContext = unknown, TElementContext = TInputContext, TProps extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  slot: string;
  use: string;
  order: number;
  label?: string;
  props?: Partial<TProps>;
  enabled?: (context: TInputContext) => boolean;
  adaptContext?: (context: TInputContext) => TElementContext;
  requiresFeature?: FeatureRequirement;
  requiresCapability?: CapabilityRequirement;
}

export interface ResolvedElementPlacement<TProps extends Record<string, unknown> = Record<string, unknown>> extends ElementPlacement<unknown, unknown, TProps> {
  sourcePath: string;
  definitionSourcePath: string;
}
