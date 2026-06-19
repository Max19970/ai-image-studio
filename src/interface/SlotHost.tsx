import { Suspense, type ElementType } from 'react';
import { isFeatureEnabled } from '../shared/features';
import { getSlotContributions } from './registry';
import { isCapabilitySatisfied } from './registry/capabilityFilters';

interface SlotHostProps<TContext> {
  slot: string;
  context: TContext;
  className?: string;
  as?: ElementType | null;
  dataTestId?: string;
}

export function SlotHost<TContext>({ slot, context, className, as: Host = 'div', dataTestId }: SlotHostProps<TContext>) {
  const contributions = getSlotContributions<TContext>(slot)
    .filter((contribution) => isFeatureEnabled(contribution.requiresFeature))
    .filter((contribution) => isCapabilitySatisfied(contribution.requiresCapability, context))
    .filter((contribution) => contribution.enabled ? contribution.enabled(context) : true);

  const children = contributions.map((contribution) => {
    const Contribution = contribution.Component;
    return (
      <Suspense key={`${contribution.sourcePath}:${contribution.id}`} fallback={null}>
        <Contribution context={context} slot={slot} />
      </Suspense>
    );
  });

  if (Host === null) return <>{children}</>;

  return (
    <Host className={className} data-ui-slot={slot} data-testid={dataTestId}>
      {children}
    </Host>
  );
}
