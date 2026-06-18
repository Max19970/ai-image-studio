import { useCallback, type ReactNode } from 'react';
import { capabilityLabels } from '../../domain/defaults';
import type { CapabilityKey } from '../../domain/providerProbe';
import { isProviderCapabilitySupported } from '../provider';
import type { GenerationParamFieldContext } from './types';
import { useI18n } from '../../i18n';
import { generationParamCopy, generationParamOptions, type GenerationParamCopyKey, type GenerationParamOptionGroup } from './metadata';
import controls from './ParamControls.module.css';

export function isParamSupported(context: Pick<GenerationParamFieldContext, 'mode' | 'capabilityReport'>, key: CapabilityKey): boolean {
  return isProviderCapabilitySupported(context.capabilityReport, context.mode, key);
}

export function capabilityLabel(key: CapabilityKey) {
  return capabilityLabels[key];
}

export interface ParamCopy {
  label: string;
  description?: string;
  ariaLabel: string;
}

export function useParamCopy() {
  const { t } = useI18n();

  const field = useCallback((key: GenerationParamCopyKey): ParamCopy => {
    const descriptor = generationParamCopy[key] as typeof generationParamCopy[GenerationParamCopyKey] & { ariaLabelKey?: string };
    const label = t(descriptor.labelKey);
    return {
      label,
      description: descriptor.descriptionKey ? t(descriptor.descriptionKey) : undefined,
      ariaLabel: t(descriptor.ariaLabelKey ?? descriptor.labelKey)
    };
  }, [t]);

  const options = useCallback(<TValue extends string>(group: GenerationParamOptionGroup) => (
    generationParamOptions[group].map((option) => ({
      value: option.value as TValue,
      label: 'labelKey' in option && option.labelKey ? t(option.labelKey) : (option.label ?? option.value)
    }))
  ), [t]);

  return { field, options };
}

export function ParamToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <label className={controls.toggle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{t('params.send')}</span>
    </label>
  );
}

export function ParamField({ label, description, children, toggle }: { label: string; description?: string; children: ReactNode; toggle?: ReactNode }) {
  return (
    <div className={controls.card}>
      <div className={controls.cardHead}>
        <div className={controls.copyBlock}>
          <label className={controls.label}>{label}</label>
          {description && <p className={controls.description}>{description}</p>}
        </div>
        {toggle}
      </div>
      {children}
    </div>
  );
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
