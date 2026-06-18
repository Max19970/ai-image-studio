import { useI18n } from '../../../../../i18n';
import { PopoverSelect } from '../../../../../shared/ui';
import { FieldShell } from '../../../components/SettingsControls';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from '../GenerationApiEditor.module.css';
import { fieldId } from '../utils';

export function ModelFields({ context, idPrefix, mobile }: { context: SettingsSectionContext; idPrefix: string; mobile: boolean }) {
  const { t } = useI18n();
  const { selectedModel, patchModel, setSelectedProviderId, providerOptions, activeInfo, setActiveInfo } = context;
  if (!selectedModel) return null;

  return (
    <div className={`${styles.fieldGrid} ${mobile ? styles.mobileFieldStack : ''}`}>
      <FieldShell id={fieldId(idPrefix, 'modelName')} label={t('settings.modelName')} info={t('settings.info.modelName')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedModel.name} onChange={(e) => patchModel('name', e.target.value)} />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'modelId')} label={t('settings.modelId')} info={t('settings.info.modelId')} activeInfo={activeInfo} setActiveInfo={setActiveInfo}>
        <input className="field-input" value={selectedModel.modelId} onChange={(e) => patchModel('modelId', e.target.value)} placeholder="gpt-image-2" />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'modelProvider')} label={t('settings.modelProvider')} info={t('settings.info.modelProvider')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <PopoverSelect
          value={selectedModel.providerId}
          onChange={(value) => {
            patchModel('providerId', value);
            setSelectedProviderId(value);
          }}
          options={providerOptions}
          ariaLabel={t('settings.modelProvider')}
          className={selectStyles.root}
          triggerClassName={selectStyles.trigger}
          panelClassName={selectStyles.panel}
          showSelectedDescription
        />
      </FieldShell>
      <FieldShell id={fieldId(idPrefix, 'modelNotes')} label={t('settings.modelNotes')} info={t('settings.info.modelNotes')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
        <textarea className="field-input min-h-[92px]" value={selectedModel.notes} onChange={(e) => patchModel('notes', e.target.value)} />
      </FieldShell>
    </div>
  );
}
