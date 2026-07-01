import { useI18n } from '../../../../../../i18n';
import { InfoTip } from '../../../../components/SettingsControls';
import styles from '../../GenerationApiEditor.module.css';
import type { ProviderSettingsFieldRendererDescriptor } from '../providerSettingsFieldRendererTypes';
import { booleanProviderSetting, providerFieldDomId, providerFieldInfoKey, providerFieldLabel } from '../providerSettingsFieldHelpers';

export const booleanProviderSettingsFieldRenderer = {
  kind: 'boolean',
  render({ context, field, provider, idPrefix }) {
    const { t } = useI18n();
    return (
      <div className={`${styles.checkCard} ${field.wide === false ? '' : styles.wide}`}>
        <label className="inline-check">
          <input type="checkbox" className="h-4 w-4 rounded" checked={booleanProviderSetting(provider, field)} onChange={(event) => context.patchProvider(field.key, event.target.checked)} />
          <span>{providerFieldLabel(field)}</span>
        </label>
        <InfoTip id={providerFieldDomId(idPrefix, field)} text={t(providerFieldInfoKey(field))} activeId={context.activeInfo} onToggle={context.setActiveInfo} />
      </div>
    );
  }
} satisfies ProviderSettingsFieldRendererDescriptor;
