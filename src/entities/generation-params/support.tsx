import { useCallback, useRef, useState, type ReactNode } from 'react';
import { capabilityLabels } from '../../domain/defaults';
import type { CapabilityKey } from '../../domain/providerProbe';
import { isProviderCapabilitySupported } from '../provider';
import type { GenerationParamFieldContext } from './types';
import { useI18n } from '../../i18n';
import { generationParamCopy, generationParamOptions, type GenerationParamCopyKey, type GenerationParamOptionGroup } from './metadata';
import controls from './ParamControls.module.css';
import { FloatingPopover } from '../../shared/ui';

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

export function ParamInfoTip({ text, ariaLabel }: { text: string; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = `param-info-${ariaLabel.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <span className={controls.infoWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${controls.infoButton} ${open ? controls.infoButtonActive : ''}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        i
      </button>
      <FloatingPopover
        open={open}
        anchorRef={buttonRef}
        id={popoverId}
        role="tooltip"
        className={controls.infoPopover}
        placement="auto"
        offset={8}
        minWidth={220}
        onDismiss={() => setOpen(false)}
      >
        {text}
      </FloatingPopover>
    </span>
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
