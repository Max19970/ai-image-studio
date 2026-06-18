import { ParamField, useParamCopy } from '../../support';
import type { GenerationParamFieldProps } from '../../types';
import controls from '../../ParamControls.module.css';

export function RawJsonField({ context }: GenerationParamFieldProps) {
  const { params, patch } = context;
  const { field } = useParamCopy();
  const rawJsonCopy = field('rawJson');
  return (
    <ParamField label={rawJsonCopy.label} description={rawJsonCopy.description}>
      <textarea
        aria-label={rawJsonCopy.ariaLabel}
        className={`${controls.input} ${controls.textareaTall}`}
        value={params.rawJson}
        onChange={(event) => patch('rawJson', event.target.value)}
        placeholder={'{\n  "seed": 123,\n  "any_future_param": true\n}'}
      />
    </ParamField>
  );
}
