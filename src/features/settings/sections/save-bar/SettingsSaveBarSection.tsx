import { useI18n } from '../../../../i18n';
import { SlotHost } from '../../../../interface/SlotHost';
import type { SettingsSaveActionContext } from '../../../../interface/context/workspace/settings';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { SettingsLayoutZoneContext } from '../../settingsTypes';
import styles from '../../../settings/SettingsPage.module.css';

export function SettingsSaveBarSection({ context }: ElementDefinitionProps<SettingsLayoutZoneContext>) {
  const { t } = useI18n();
  const className = context.variant === 'mobile'
    ? `${styles.mobileSaveStrip} glass-panel`
    : `${styles.saveBar} glass-panel`;
  const actionsClassName = context.variant === 'mobile' ? styles.mobileSaveActions : styles.saveActions;

  return (
    <div className={className} onClick={(event) => event.stopPropagation()}>
      <div>
        <span className="section-kicker">{t('settings.actions')}</span>
        <strong>{context.saved ? t('settings.saved') : context.isDirty ? t('settings.unsaved') : t('settings.noChanges')}</strong>
      </div>
      <SlotHost<SettingsSaveActionContext>
        slot="settings/save-actions"
        context={{ isDirty: context.isDirty, onReset: context.onReset, onSave: context.onSave }}
        className={actionsClassName}
      />
    </div>
  );
}
