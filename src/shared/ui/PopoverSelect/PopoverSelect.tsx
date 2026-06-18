import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FloatingPopover } from '../FloatingPopover';
import styles from './PopoverSelect.module.css';

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

function enabledOptionIndex(options: PopoverSelectOption[], start: number, direction: 1 | -1) {
  if (options.length === 0) return -1;
  for (let step = 0; step < options.length; step += 1) {
    const index = (start + step * direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function firstEnabledOptionIndex(options: PopoverSelectOption[]) {
  return enabledOptionIndex(options, 0, 1);
}

function lastEnabledOptionIndex(options: PopoverSelectOption[]) {
  return enabledOptionIndex(options, options.length - 1, -1);
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;
  const activeOptionId = activeOption ? `${generatedId}-option-${activeIndex}` : undefined;

  const openWithIndex = (index: number) => {
    const resolvedIndex = index >= 0 && !options[index]?.disabled ? index : firstEnabledOptionIndex(options);
    setActiveIndex(resolvedIndex);
    setOpen(true);
  };

  const closeAndFocusTrigger = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const selectOption = (option: PopoverSelectOption | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    closeAndFocusTrigger();
  };

  useEffect(() => {
    if (!open) return;
    const index = activeIndex >= 0 ? activeIndex : selectedIndex >= 0 ? selectedIndex : firstEnabledOptionIndex(options);
    if (index !== activeIndex) setActiveIndex(index);
    requestAnimationFrame(() => optionRefs.current[index]?.focus({ preventScroll: true }));
  }, [open, activeIndex, selectedIndex, options]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openWithIndex(selectedIndex >= 0 ? enabledOptionIndex(options, selectedIndex + 1, 1) : firstEnabledOptionIndex(options));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      openWithIndex(selectedIndex >= 0 ? enabledOptionIndex(options, selectedIndex - 1, -1) : lastEnabledOptionIndex(options));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      openWithIndex(firstEnabledOptionIndex(options));
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      openWithIndex(lastEnabledOptionIndex(options));
    }
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusTrigger();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => enabledOptionIndex(options, index + 1, 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => enabledOptionIndex(options, index - 1, -1));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(firstEnabledOptionIndex(options));
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(lastEnabledOptionIndex(options));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(options[activeIndex]);
    }
  };

  return (
    <div className={cx(styles.root, 'popover-select', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, 'popover-select-trigger', triggerClassName, open && styles.open, open && 'open')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) {
            closeAndFocusTrigger();
            return;
          }
          openWithIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledOptionIndex(options));
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={cx(styles.copy, 'popover-select-copy')}>
          <strong>{selected?.label || placeholder || ''}</strong>
          {showSelectedDescription && (selected?.description || emptyText) && <small>{selected?.description || emptyText}</small>}
        </span>
        <span className={cx(styles.chevron, 'popover-select-chevron')} aria-hidden="true">⌄</span>
      </button>

      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        id={`${generatedId}-popover`}
        className={cx(styles.panel, 'popover-select-panel', panelClassName)}
        placement="auto"
        offset={8}
        viewportMargin={12}
        matchAnchorWidth={matchAnchorWidth}
        minWidth={minWidth}
        returnFocusOnEscape={false}
        onDismiss={(reason) => {
          setOpen(false);
          if (reason === 'escape') requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
        }}
      >
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={activeOptionId}
          onKeyDown={handleListboxKeyDown}
        >
          {options.length === 0 ? (
            <div className={cx(styles.empty, 'popover-select-empty')}>{emptyText || placeholder || ''}</div>
          ) : (
            <div className={cx(styles.scroll, 'popover-select-scroll')}>
              {options.map((option, index) => {
                const isActive = option.value === value;
                const isKeyboardActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    id={`${generatedId}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cx(
                      styles.option,
                      'popover-select-option',
                      isActive && styles.active,
                      isActive && 'active',
                      isKeyboardActive && styles.keyboardActive
                    )}
                    disabled={option.disabled}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                  >
                    <span className={cx(styles.optionCopy, 'popover-select-option-copy')}>
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                    <span className={cx(styles.optionSide, 'popover-select-option-side')}>
                      {renderOptionSuffix?.(option)}
                      {isActive && <span className={cx(styles.check, 'popover-select-check')} aria-hidden="true">•</span>}
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
