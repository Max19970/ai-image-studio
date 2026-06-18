import { ParamField, ParamToggle, clampNumber, useParamCopy } from '../../support';
import type { GenerationParamCopyKey, GenerationParamFieldProps } from '../../types';
import type { ImageParams } from '../../../../domain/imageParams';
import controls from '../../ParamControls.module.css';

export interface NumberParamFieldConfig {
  copyKey: GenerationParamCopyKey;
  valueKey: keyof ImageParams;
  includeKey?: keyof ImageParams;
  min?: number;
  max?: number;
  step?: number;
  round?: boolean;
}

export function NumberParamField({ context, props }: GenerationParamFieldProps<NumberParamFieldConfig>) {
  const { params, patch } = context;
  const { field } = useParamCopy();
  const copy = field(props.copyKey);
  return (
    <ParamField
      label={copy.label}
      description={copy.description}
      toggle={props.includeKey ? <ParamToggle checked={Boolean(params[props.includeKey])} onChange={(next) => patch(props.includeKey!, next as ImageParams[typeof props.includeKey])} /> : undefined}
    >
      <input
        aria-label={copy.ariaLabel}
        className={controls.input}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step}
        value={Number(params[props.valueKey])}
        onChange={(event) => {
          let next = Number(event.target.value);
          if (props.round) next = Math.round(next);
          if (typeof props.min === 'number' && typeof props.max === 'number') next = clampNumber(next, props.min, props.max);
          patch(props.valueKey, next as ImageParams[typeof props.valueKey]);
        }}
      />
    </ParamField>
  );
}
