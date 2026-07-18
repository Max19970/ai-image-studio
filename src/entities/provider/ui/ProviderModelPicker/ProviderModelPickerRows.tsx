import { memo, type KeyboardEvent } from 'react';
import { CheckIcon, SearchIcon, XIcon } from '../../../../shared/ui/Icon';
import type {
  ProviderModelPickerModelRow,
  ProviderModelPickerRow
} from './providerModelPickerModel';
import styles from './ProviderModelPicker.module.css';

export function ProviderModelSearchIcon() {
  return <SearchIcon size={20} />;
}

export function ProviderModelClearIcon() {
  return <XIcon size={16} />;
}

export const ProviderModelGroupHeader = memo(function ProviderModelGroupHeader({
  row
}: {
  row: Extract<ProviderModelPickerRow, { kind: 'group' }>;
}) {
  return (
    <div className={styles.groupHeader} role="presentation">
      <strong>{row.groupLabel}</strong>
      <span>{row.modelCount}</span>
    </div>
  );
});

interface ProviderModelOptionProps {
  row: ProviderModelPickerModelRow;
  selected: boolean;
  active: boolean;
  disabled: boolean;
  setModelRef: (modelId: string, element: HTMLButtonElement | null) => void;
  onSelect: (modelId: string) => void;
  onFocus: (modelId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, row: ProviderModelPickerModelRow) => void;
}

export const ProviderModelOption = memo(function ProviderModelOption({
  row,
  selected,
  active,
  disabled,
  setModelRef,
  onSelect,
  onFocus,
  onKeyDown
}: ProviderModelOptionProps) {
  const { model } = row;
  const accessibleLabel = [model.label, model.modelId, model.providerName].filter(Boolean).join(', ');

  return (
    <button
      ref={(element) => setModelRef(model.value, element)}
      type="button"
      role="option"
      className={styles.modelButton}
      data-selected={selected ? 'true' : 'false'}
      data-active={active ? 'true' : 'false'}
      data-provider-model-option={model.value}
      aria-label={accessibleLabel}
      aria-selected={selected}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(model.value)}
      onFocus={() => onFocus(model.value)}
      onKeyDown={(event) => onKeyDown(event, row)}
    >
      <span className={styles.modelCopy}>
        <strong>{model.label}</strong>
        <small>{model.modelId}</small>
      </span>
      <span className={styles.selectionMark} aria-hidden="true" data-visible={selected ? 'true' : 'false'}>
        <CheckIcon size={16} strokeWidth={2.1} />
      </span>
    </button>
  );
});
