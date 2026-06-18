import { useI18n } from '../../../../i18n';
import { useParamCopy } from '../../support';
import type { GenerationParamFieldProps } from '../../types';
import controls from '../../ParamControls.module.css';

export function IncludeModelField({ context }: GenerationParamFieldProps) {
  const { t } = useI18n();
  const { params, patch } = context;
  const { field } = useParamCopy();
  const includeModelCopy = field('includeModel');
  return (
    <div className={`${controls.card} ${controls.flatCheckCard}`}>
      <label className={controls.inlineCheck} title={includeModelCopy.description}>
        <input type="checkbox" checked={params.includeModel} onChange={(event) => patch('includeModel', event.target.checked)} />
        <span>{t('params.includeModelBefore')} <code>model</code> {t('params.includeModelAfter')}</span>
      </label>
    </div>
  );
}
