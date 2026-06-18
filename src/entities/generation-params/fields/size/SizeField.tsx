import { sizePresets } from '../../../../domain/defaults';
import { validateCustomSize } from '../../../../entities/provider/request';
import { PopoverSelect } from '../../../../shared/ui';
import { ParamField, useParamCopy } from '../../support';
import type { GenerationParamFieldProps } from '../../types';
import type { ImageParams } from '../../../../domain/imageParams';
import controls from '../../ParamControls.module.css';

export function SizeField({ context }: GenerationParamFieldProps) {
  const { params, patch } = context;
  const { field, options } = useParamCopy();
  const customErrors = params.sizeMode === 'custom' ? validateCustomSize(params.width, params.height) : [];
  const sizeModeCopy = field('sizeMode');
  const presetCopy = field('preset');
  const widthCopy = field('width');
  const heightCopy = field('height');

  return (
    <>
      <ParamField label={sizeModeCopy.label} description={sizeModeCopy.description}>
        <PopoverSelect
          value={params.sizeMode}
          onChange={(value) => patch('sizeMode', value as ImageParams['sizeMode'])}
          options={options<ImageParams['sizeMode']>('sizeMode')}
          ariaLabel={sizeModeCopy.ariaLabel}
          className={controls.select}
          triggerClassName={controls.selectTrigger}
          panelClassName={controls.selectPanel}
        />
      </ParamField>

      {params.sizeMode === 'preset' && (
        <ParamField label={presetCopy.label} description={presetCopy.description}>
          <PopoverSelect
            value={params.sizePreset}
            onChange={(value) => patch('sizePreset', value)}
            options={sizePresets.map((preset) => ({ value: preset, label: preset }))}
            ariaLabel={presetCopy.ariaLabel}
            className={controls.select}
            triggerClassName={controls.selectTrigger}
            panelClassName={controls.selectPanel}
          />
        </ParamField>
      )}

      {params.sizeMode === 'custom' && (
        <>
          <ParamField label={widthCopy.label} description={widthCopy.description}>
            <input aria-label={widthCopy.ariaLabel} className={controls.input} type="number" step={16} value={params.width} onChange={(event) => patch('width', Number(event.target.value))} />
          </ParamField>
          <ParamField label={heightCopy.label} description={heightCopy.description}>
            <input aria-label={heightCopy.ariaLabel} className={controls.input} type="number" step={16} value={params.height} onChange={(event) => patch('height', Number(event.target.value))} />
          </ParamField>
        </>
      )}

      {customErrors.length > 0 && (
        <div className={`${controls.warningStrip} ${controls.fieldGridFull}`}>{customErrors.map((error) => <p key={error}>{error}</p>)}</div>
      )}
    </>
  );
}
