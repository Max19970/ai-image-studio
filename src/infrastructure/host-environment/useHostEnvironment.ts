import { hostEnvironmentDescriptors } from './registry';
import type { HostAppDecorations, HostEnvironmentState } from './types';

export interface ActiveHostEnvironment {
  active: HostEnvironmentState | null;
  states: HostEnvironmentState[];
  decorations: HostAppDecorations;
}

export function useHostEnvironment(): ActiveHostEnvironment {
  const states = hostEnvironmentDescriptors.map((descriptor) => descriptor.useState());
  const activeIndex = states.findIndex((state) => state.available);
  const active = activeIndex >= 0 ? states[activeIndex] : null;
  const descriptor = activeIndex >= 0 ? hostEnvironmentDescriptors[activeIndex] : null;
  const decorations = active && descriptor?.getAppDecorations ? descriptor.getAppDecorations(active) : {};

  return { active, states, decorations };
}
