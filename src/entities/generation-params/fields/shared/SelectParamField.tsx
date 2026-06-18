import { PopoverSelect } from '../../../../shared/ui';
import { ParamField, ParamToggle, useParamCopy } from '../../support';
import type { GenerationParamCopyKey, GenerationParamFieldProps, GenerationParamOptionGroup } from '../../types';
import type { ImageParams } from '../../../../domain/imageParams';
import controls from '../../ParamControls.module.css';

export interface SelectParamFieldConfig {
  copyKey: GenerationParamCopyKey;
  valueKey: keyof ImageParams;
  optionGroup: GenerationParamOptionGroup;
  includeKey?: keyof ImageParams;
}

export function SelectParamField({ context, props }: GenerationParamFieldProps<SelectParamFieldConfig>) {
  const { params, patch } = context;
  const { field, options } = useParamCopy();
  const copy = field(props.copyKey);
  const value = params[props.valueKey];
  return (
    <ParamField
      label={copy.label}
      description={copy.description}
      toggle={props.includeKey ? <ParamToggle checked={Boolean(params[props.includeKey])} onChange={(next) => patch(props.includeKey!, next as ImageParams[typeof props.includeKey])} /> : undefined}
    >
      <PopoverSelect
        value={String(value)}
        onChange={(next) => patch(props.valueKey, coerceValue(next, value) as ImageParams[typeof props.valueKey])}
        options={options(props.optionGroup)}
        ariaLabel={copy.ariaLabel}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
      />
    </ParamField>
  );
}

function coerceValue(next: string, current: unknown) {
  if (typeof current === 'boolean') return next === 'true';
  return next;
}
