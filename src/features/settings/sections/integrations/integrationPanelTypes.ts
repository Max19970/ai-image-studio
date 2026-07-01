import type { ComponentType } from 'react';
import type { IntegrationDefinition, IntegrationId } from '../../../../entities/integrations';
import type { SettingsSectionVariant } from '../../settingsTypes';

export interface IntegrationSettingsPanelProps {
  definition: IntegrationDefinition;
  variant: SettingsSectionVariant;
}

export interface IntegrationSettingsPanelDescriptor {
  integrationId: IntegrationId;
  Component: ComponentType<IntegrationSettingsPanelProps>;
}
