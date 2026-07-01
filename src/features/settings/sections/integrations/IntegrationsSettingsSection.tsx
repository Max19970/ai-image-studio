import { useMemo, useState } from 'react';
import type { IntegrationId } from '../../../../entities/integrations';
import { getIntegrationDefinition, listIntegrationDefinitions } from '../../../../entities/integrations';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { useI18n } from '../../../../i18n';
import type { SettingsSectionContext, SettingsSectionVariant } from '../../settingsTypes';
import { IntegrationSubTabs } from './IntegrationSubTabs';
import { integrationSettingsPanelDescriptorsById } from './integrationPanels';
import styles from './IntegrationsSettingsSection.module.css';

type IntegrationsSettingsSectionProps = {
  variant: SettingsSectionVariant;
} & Record<string, unknown>;

export function IntegrationsSettingsSection({ props }: ElementDefinitionProps<SettingsSectionContext, IntegrationsSettingsSectionProps>) {
  const { t } = useI18n();
  const definitions = useMemo(() => listIntegrationDefinitions(), []);
  const [activeId, setActiveId] = useState<IntegrationId>(definitions[0]?.id ?? '');
  const activeDefinition = getIntegrationDefinition(activeId) ?? definitions[0] ?? null;
  const activePanel = activeDefinition ? integrationSettingsPanelDescriptorsById.get(activeDefinition.id) : null;
  const Panel = activePanel?.Component;
  const variant = props.variant;

  if (!activeDefinition) {
    return (
      <section className={styles.subpage} data-settings-section="integrations" data-settings-variant={variant}>
        <Header variant={variant} />
        <div className={styles.empty}>{t('settings.integrations.empty')}</div>
      </section>
    );
  }

  return (
    <section className={styles.subpage} data-settings-section="integrations" data-settings-variant={variant}>
      <Header variant={variant} />
      <IntegrationSubTabs definitions={definitions} activeId={activeDefinition.id} onChange={setActiveId} variant={variant} />
      {Panel ? <Panel definition={activeDefinition} variant={variant} /> : <div className={styles.empty}>{t('settings.integrations.unsupported')}</div>}
    </section>
  );
}

function Header({ variant }: { variant: SettingsSectionVariant }) {
  const { t } = useI18n();
  const className = variant === 'mobile' ? styles.mobileHeading : styles.heading;

  return (
    <div className={className}>
      <p className="section-kicker">{t('settings.tab.integrations')}</p>
      <h3>{t('settings.integrations.title')}</h3>
      <p>{t('settings.integrations.text')}</p>
    </div>
  );
}
