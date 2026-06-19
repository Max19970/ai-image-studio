import type { ImageParams } from '../../../../domain/imageParams';
import type { ProviderSettings } from '../../../../domain/providerSettings';
import type { StudioSettings } from '../../../../domain/studioSettings';
import { useI18n } from '../../../../i18n';
import { getComfyUiRegisteredLoraOptions, toggleComfyUiRegisteredLoraById } from '../loraSelection';
import styles from './ComfyUiLoraQuickGroup.module.css';

interface Props {
  settings: StudioSettings;
  params: ImageParams;
  provider: ProviderSettings;
  onChangeParams: (params: ImageParams) => void;
  onAfterChange?: () => void;
  testId?: string;
}

export function ComfyUiLoraQuickGroup({ settings, params, provider, onChangeParams, onAfterChange, testId }: Props) {
  const { t } = useI18n();
  const options = getComfyUiRegisteredLoraOptions(settings, params, provider);
  const activeCount = options.filter((option) => option.selected).length;

  const toggle = (id: string) => {
    onChangeParams(toggleComfyUiRegisteredLoraById(settings, params, provider, id));
    onAfterChange?.();
  };

  return (
    <div className={styles.group} data-testid={testId} data-active-loras={activeCount}>
      <span className={styles.groupTitle}>{t('composer.comfy.loras')}</span>
      {options.length === 0 ? (
        <div className={styles.empty}>{t('composer.comfy.noLoras')}</div>
      ) : (
        <div className={styles.stack}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={styles.loraButton}
              data-active={option.selected ? 'true' : 'false'}
              onClick={() => toggle(option.id)}
            >
              <span className={styles.icon} aria-hidden="true">Lo</span>
              <span className={styles.copy}>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span className={styles.statusIcon} aria-hidden="true">{option.selected ? 'on' : 'off'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
