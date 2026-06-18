import { useI18n } from '../../../../i18n';
import { ParamField, clampNumber, useParamCopy } from '../../support';
import type { GenerationParamFieldProps } from '../../types';
import controls from '../../ParamControls.module.css';

export function RetryPolicyField({ context }: GenerationParamFieldProps) {
  const { t } = useI18n();
  const { params, patch } = context;
  const { field } = useParamCopy();
  const attemptsCopy = field('retryAttempts');
  const delayCopy = field('retryDelaySeconds');
  return (
    <>
      <div className={`${controls.retryVisualCard} ${controls.fieldGridFull}`}>
        <div className={controls.retryOrbit} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>{params.retryAttempts > 0 ? t('params.retryEnabled') : t('params.retryDisabled')}</strong>
          <p>{params.retryAttempts > 0 ? t('params.retrySummary', { attempts: params.retryAttempts, seconds: params.retryDelaySeconds }) : t('params.retryDisabledText')}</p>
        </div>
      </div>

      <ParamField label={attemptsCopy.label} description={attemptsCopy.description}>
        <input
          aria-label={attemptsCopy.ariaLabel}
          className={controls.input}
          type="number"
          min={0}
          max={10}
          value={params.retryAttempts}
          onChange={(event) => patch('retryAttempts', clampNumber(Math.round(Number(event.target.value)), 0, 10))}
        />
      </ParamField>

      <ParamField label={delayCopy.label} description={delayCopy.description}>
        <input
          aria-label={delayCopy.ariaLabel}
          className={controls.input}
          type="number"
          min={0}
          max={600}
          step={0.5}
          value={params.retryDelaySeconds}
          onChange={(event) => patch('retryDelaySeconds', clampNumber(Number(event.target.value), 0, 600))}
        />
      </ParamField>
    </>
  );
}
