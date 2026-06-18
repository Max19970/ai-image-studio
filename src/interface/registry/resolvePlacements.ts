import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { ResolvedSlotContribution, SlotContributionProps } from '../slots/types';
import { definitionsById } from './definitions';
import { elementPlacements } from './placements';
import type { ElementDefinition, ResolvedElementPlacement } from './types';

export const resolvedPlacementContributions = elementPlacements
  .map((placement): ResolvedSlotContribution | null => {
    const definition = definitionsById.get(placement.use) as ElementDefinition | undefined;
    if (!definition) {
      if (import.meta.env.DEV) {
        console.warn(`[placements] Placement "${placement.id}" references missing definition "${placement.use}" from ${placement.sourcePath}`);
      }
      return null;
    }

    const resolvedPlacement: ResolvedElementPlacement = {
      ...placement,
      sourcePath: placement.sourcePath,
      definitionSourcePath: definition.sourcePath ?? 'unknown'
    };

    const Component: ComponentType<SlotContributionProps<unknown>> = ({ context, slot }) => {
      const elementContext = placement.adaptContext ? placement.adaptContext(context) : context;
      const props = {
        ...(definition.defaultProps ?? {}),
        ...(placement.props ?? {})
      } as Record<string, unknown>;

      return createElement(definition.Component as ComponentType<any>, {
        context: elementContext,
        slot,
        placement: resolvedPlacement,
        props
      });
    };

    return {
      id: placement.id,
      label: placement.label ?? definition.label,
      slot: placement.slot,
      order: placement.order,
      enabled: (context: unknown) => {
        if (placement.enabled && !placement.enabled(context)) return false;
        const elementContext = placement.adaptContext ? placement.adaptContext(context) : context;
        const props = {
          ...(definition.defaultProps ?? {}),
          ...(placement.props ?? {})
        } as Record<string, unknown>;
        return definition.enabled ? definition.enabled(elementContext, props) : true;
      },
      requiresFeature: placement.requiresFeature,
      requiresCapability: placement.requiresCapability,
      Component,
      sourcePath: `${placement.sourcePath} -> ${definition.sourcePath ?? definition.id}`
    };
  })
  .filter((item): item is ResolvedSlotContribution => item !== null);
