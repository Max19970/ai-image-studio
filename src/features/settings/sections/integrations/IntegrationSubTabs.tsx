import type { IntegrationDefinition, IntegrationId } from '../../../../entities/integrations';
import { useI18n } from '../../../../i18n';
import { integrationHintKey, integrationLabelKey } from './integrationLabels';
import styles from './IntegrationsSettingsSection.module.css';

interface Props {
  definitions: readonly IntegrationDefinition[];
  activeId: IntegrationId;
  onChange: (id: IntegrationId) => void;
  variant: 'desktop' | 'mobile';
}

export function IntegrationSubTabs({ definitions, activeId, onChange, variant }: Props) {
  const { t } = useI18n();

  return (
    <div
      className={variant === 'mobile' ? styles.mobileSubTabs : styles.subTabs}
      role="tablist"
      aria-label={t('settings.integrations.subTabsAria')}
      data-testid="settings-integrations-tabs"
    >
      {definitions.map((definition) => {
        const active = definition.id === activeId;
        return (
          <button
            key={definition.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? styles.active : ''}
            onClick={() => onChange(definition.id)}
          >
            <strong>{t(integrationLabelKey(definition))}</strong>
            <span>{t(integrationHintKey(definition))}</span>
          </button>
        );
      })}
    </div>
  );
}
