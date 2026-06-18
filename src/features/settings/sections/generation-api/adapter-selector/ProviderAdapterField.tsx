import { getProviderAdapterDefinition, listProviderAdapterDefinitions } from '../../../../../entities/provider/registry';
import { useI18n } from '../../../../../i18n';
import { Button, PopoverSelect } from '../../../../../shared/ui';
import { FieldShell } from '../../../components/SettingsControls';
import selectStyles from '../../../components/SettingsPopoverSelect.module.css';
import type { SettingsSectionContext } from '../../../settingsTypes';
import styles from './ProviderAdapterField.module.css';
import { fieldId } from '../utils';

export function ProviderAdapterField({ context, idPrefix }: { context: SettingsSectionContext; idPrefix: string }) {
  const { t } = useI18n();
  const { selectedProvider, patchProvider, activeInfo, setActiveInfo } = context;
  if (!selectedProvider) return null;

  const adapter = getProviderAdapterDefinition(selectedProvider.adapterId);
  const adapterOptions = listProviderAdapterDefinitions().map((definition) => ({
    value: definition.id,
    label: definition.label,
    description: definition.description
  }));

  const applyAdapterDefaults = () => {
    patchProvider('adapterId', adapter.id);
    patchProvider('generationEndpoint', adapter.defaultGenerationEndpoint);
    patchProvider('editEndpoint', adapter.defaultEditEndpoint);
  };

  return (
    <FieldShell id={fieldId(idPrefix, 'providerAdapter')} label={t('settings.providerAdapter')} info={t('settings.info.providerAdapter')} activeInfo={activeInfo} setActiveInfo={setActiveInfo} wide>
      <div className={styles.adapterField}>
        <PopoverSelect
          value={adapter.id}
          onChange={(value) => {
            const nextAdapter = getProviderAdapterDefinition(value);
            patchProvider('adapterId', nextAdapter.id);
          }}
          options={adapterOptions}
          ariaLabel={t('settings.providerAdapter')}
          className={selectStyles.root}
          triggerClassName={selectStyles.trigger}
          panelClassName={selectStyles.panel}
          showSelectedDescription
        />
        <div className={styles.adapterProfile} data-provider-adapter={adapter.id}>
          <div>
            <strong>{adapter.label}</strong>
            <span>{adapter.description}</span>
          </div>
          <dl>
            <div>
              <dt>{t('settings.adapterGenerationDefault')}</dt>
              <dd>{adapter.defaultGenerationEndpoint}</dd>
            </div>
            <div>
              <dt>{t('settings.adapterEditDefault')}</dt>
              <dd>{adapter.defaultEditEndpoint}</dd>
            </div>
            <div>
              <dt>{t('settings.adapterMultipartEdit')}</dt>
              <dd>{adapter.supportsMultipartEdit ? t('settings.adapterSupported') : t('settings.adapterUnsupported')}</dd>
            </div>
          </dl>
          <Button variant="secondary" size="micro" onClick={applyAdapterDefaults}>{t('settings.applyAdapterDefaults')}</Button>
        </div>
      </div>
    </FieldShell>
  );
}
