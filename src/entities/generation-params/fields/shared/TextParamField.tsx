import { ParamField, ParamToggle, useParamCopy } from '../../support';
import type { GenerationParamCopyKey, GenerationParamFieldProps } from '../../types';
import type { ImageParams } from '../../../../domain/imageParams';
import controls from '../../ParamControls.module.css';

export interface TextParamFieldConfig {
  copyKey: GenerationParamCopyKey;
  valueKey: keyof ImageParams;
  includeKey?: keyof ImageParams;
  placeholder?: string;
}

export function TextParamField({ context, props }: GenerationParamFieldProps<TextParamFieldConfig>) {
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
        value={String(params[props.valueKey] ?? '')}
        onChange={(event) => patch(props.valueKey, event.target.value as ImageParams[typeof props.valueKey])}
        placeholder={props.placeholder}
      />
    </ParamField>
  );
}
