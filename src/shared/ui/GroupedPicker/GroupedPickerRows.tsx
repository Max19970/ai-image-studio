import { memo, type KeyboardEvent } from 'react';
import type { GroupedPickerItemRow, GroupedPickerRow } from './groupedPickerModel';
import styles from './GroupedPicker.module.css';

export function GroupedPickerSearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12.8 12.8 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function GroupedPickerClearIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.4 8.3 2.8 2.8 6.4-6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const GroupedPickerVirtualGroupHeader = memo(function GroupedPickerVirtualGroupHeader({
  row
}: {
  row: Extract<GroupedPickerRow, { kind: 'group' }>;
}) {
  return (
    <div className={styles.groupHeader} role="presentation">
      <strong>{row.groupLabel}</strong>
      <span>{row.itemCount}</span>
    </div>
  );
});

interface VirtualItemProps {
  row: GroupedPickerItemRow;
  selected: boolean;
  active: boolean;
  disabled: boolean;
  setItemRef: (itemId: string, element: HTMLButtonElement | null) => void;
  onSelect: (itemId: string) => void;
  onFocus: (itemId: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, row: GroupedPickerItemRow) => void;
}

export const GroupedPickerVirtualItem = memo(function GroupedPickerVirtualItem({
  row,
  selected,
  active,
  disabled,
  setItemRef,
  onSelect,
  onFocus,
  onKeyDown
}: VirtualItemProps) {
  const { item } = row;
  const accessibleLabel = [item.label, item.description, row.groupLabel].filter(Boolean).join(', ');

  return (
    <button
      ref={(element) => setItemRef(item.id, element)}
      type="button"
      role="option"
      className={styles.itemButton}
      data-selected={selected ? 'true' : 'false'}
      data-active={active ? 'true' : 'false'}
      data-grouped-picker-item={item.id}
      aria-label={accessibleLabel}
      aria-selected={selected}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(item.id)}
      onFocus={() => onFocus(item.id)}
      onKeyDown={(event) => onKeyDown(event, row)}
    >
      <span className={styles.itemCopy}>
        <strong>{item.label}</strong>
        {item.description && <small>{item.description}</small>}
      </span>
      <span className={styles.selectionMark} aria-hidden="true" data-visible={selected ? 'true' : 'false'}>
        <CheckIcon />
      </span>
    </button>
  );
});
