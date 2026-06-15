import { useMemo, useRef, useState, type ReactNode } from 'react';
import { FloatingPopover } from './FloatingPopover';

export interface PopoverSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  options: PopoverSelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  showSelectedDescription?: boolean;
  emptyText?: string;
  renderOptionSuffix?: (option: PopoverSelectOption) => ReactNode;
  matchAnchorWidth?: boolean;
  minWidth?: number;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function PopoverSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled = false,
  className,
  triggerClassName,
  panelClassName,
  showSelectedDescription = false,
  emptyText,
  renderOptionSuffix,
  matchAnchorWidth = true,
  minWidth
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  return (
    <div className={cx('popover-select', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cx('popover-select-trigger', triggerClassName, open && 'open')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="popover-select-copy">
          <strong>{selected?.label || placeholder || ''}</strong>
          {showSelectedDescription && (selected?.description || emptyText) && <small>{selected?.description || emptyText}</small>}
        </span>
        <span className="popover-select-chevron" aria-hidden="true">⌄</span>
      </button>

      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        className={cx('popover-select-panel', panelClassName)}
        placement="auto"
        offset={8}
        viewportMargin={12}
        matchAnchorWidth={matchAnchorWidth}
        minWidth={minWidth}
        onDismiss={() => setOpen(false)}
      >
        <div role="listbox" aria-label={ariaLabel}>
          {options.length === 0 ? (
            <div className="popover-select-empty">{emptyText || placeholder || ''}</div>
          ) : (
            <div className="popover-select-scroll">
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cx('popover-select-option', isActive && 'active')}
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="popover-select-option-copy">
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                    <span className="popover-select-option-side">
                      {renderOptionSuffix?.(option)}
                      {isActive && <span className="popover-select-check" aria-hidden="true">•</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FloatingPopover>
    </div>
  );
}
