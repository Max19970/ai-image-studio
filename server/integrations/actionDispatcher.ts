import type {
  IntegrationActionResult,
  IntegrationRuntimeAdapter,
  IntegrationRuntimeConfig
} from './types';

export interface IntegrationRuntimeActionInput {
  adapter: IntegrationRuntimeAdapter;
  actionId: string;
  config: IntegrationRuntimeConfig;
  payload: Record<string, unknown>;
}

type IntegrationRuntimeActionHandler = (input: IntegrationRuntimeActionInput) => Promise<IntegrationActionResult>;

const standardRuntimeActions = new Map<string, IntegrationRuntimeActionHandler>([
  ['start-runtime', ({ adapter, config }) => adapter.start(config)],
  ['stop-runtime', ({ adapter }) => adapter.stop()]
]);

export async function runIntegrationRuntimeAction(input: IntegrationRuntimeActionInput): Promise<IntegrationActionResult> {
  const standardAction = standardRuntimeActions.get(input.actionId);
  if (standardAction) return standardAction(input);
  return input.adapter.runAction(input.actionId, { config: input.config, payload: input.payload });
}
