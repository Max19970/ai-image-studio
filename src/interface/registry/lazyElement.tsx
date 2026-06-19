import { lazy, type ComponentType } from 'react';
import type { ElementDefinitionProps } from './types';

export function lazyElementComponent<
  TContext = unknown,
  TProps extends Record<string, unknown> = Record<string, unknown>
>(
  loadModule: () => Promise<Record<string, unknown>>,
  exportName: string
): ComponentType<ElementDefinitionProps<TContext, TProps>> {
  return lazy(async () => {
    const module = await loadModule();
    const Component = module[exportName];

    if (!Component) {
      throw new Error(`[lazyElement] Missing export "${exportName}" in lazy element module.`);
    }

    return { default: Component as ComponentType<ElementDefinitionProps<TContext, TProps>> };
  });
}
