import { freeuV2Plugin } from './freeuV2Plugin';
import { loraStackPlugin } from './loraStackPlugin';
import { pagPlugin } from './pagPlugin';
import { perpGuiderPlugin } from './perpGuiderPlugin';
import { tiledGenerationPlugin } from './tiledGenerationPlugin';
import { tiledVaePlugin } from './tiledVaePlugin';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const workflowPluginDefinitions: readonly WorkflowPluginDefinition[] = [
  tiledGenerationPlugin,
  tiledVaePlugin,
  pagPlugin,
  freeuV2Plugin,
  perpGuiderPlugin,
  loraStackPlugin
];

export const workflowPluginDefinitionsByKind = new Map(
  workflowPluginDefinitions.map((definition) => [definition.kind, definition] as const)
);
