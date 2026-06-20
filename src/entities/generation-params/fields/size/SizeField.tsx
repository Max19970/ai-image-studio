import { sizePresets } from '../../../../domain/defaults';
import { validateCustomSize } from '../../../../entities/provider/request';
import { getModeImageSizeConstraint } from '../../../../entities/provider/valueConstraints';
import { PopoverSelect } from '../../../../shared/ui';
import { ParamField, ParamInfoTip, useParamCopy } from '../../support';
import type { GenerationParamFieldProps } from '../../types';
import type { ImageParams } from '../../../../domain/imageParams';
import { useI18n } from '../../../../i18n';
import controls from '../../ParamControls.module.css';
import { DraftNumberInput } from '../shared/DraftNumberInput';

export function SizeField({ context }: GenerationParamFieldProps) {
  const { params, patch } = context;
  const { field, options } = useParamCopy();
  const { t } = useI18n();
  const customErrors = params.sizeMode === 'custom' ? validateCustomSize(params.width, params.height, context.provider, context.providerMode) : [];
  const sizeConstraint = getModeImageSizeConstraint(context.providerMode);
  const sizeRulesText = t(sizeConstraint.infoKey ?? 'params.sizeRules.generic', {
    min: sizeConstraint.min,
    max: sizeConstraint.max,
    multiple: sizeConstraint.multipleOf ?? 1,
    snap: t(sizeConstraint.snap === 'ceil' ? 'params.sizeRules.snap.ceil' : sizeConstraint.snap === 'round' ? 'params.sizeRules.snap.round' : 'params.sizeRules.snap.floor')
  });
  const sizeModeCopy = field('sizeMode');
  const presetCopy = field('preset');
  const widthCopy = field('width');
  const heightCopy = field('height');
  const sizeRulesTip = <ParamInfoTip ariaLabel={t('params.sizeRules.infoButton')} text={sizeRulesText} />;

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
          <ParamField label={widthCopy.label} description={widthCopy.description} toggle={sizeRulesTip}>
            <DraftNumberInput ariaLabel={widthCopy.ariaLabel} className={controls.input} value={params.width} onChange={(value) => patch('width', value)} />
          </ParamField>
          <ParamField label={heightCopy.label} description={heightCopy.description} toggle={sizeRulesTip}>
            <DraftNumberInput ariaLabel={heightCopy.ariaLabel} className={controls.input} value={params.height} onChange={(value) => patch('height', value)} />
          </ParamField>
        </>
      )}

      {customErrors.length > 0 && (
        <div className={`${controls.warningStrip} ${controls.fieldGridFull}`}>{customErrors.map((error) => <p key={error}>{error}</p>)}</div>
      )}
    </>
  );
}
