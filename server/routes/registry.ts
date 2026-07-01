import type { BackendRouteGroup } from './types';
import { backendRouteGroupGeneratedModules } from './registry.generated';

export function listBackendRouteGroups(): BackendRouteGroup[] {
  return Object.values(backendRouteGroupGeneratedModules);
}
