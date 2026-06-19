import type { IntegrationDefinition } from '../../../../entities/integrations';

export function integrationLabelKey(definition: IntegrationDefinition): string {
  return `settings.integrations.${definition.id}.label`;
}

export function integrationHintKey(definition: IntegrationDefinition): string {
  return `settings.integrations.${definition.id}.hint`;
}
