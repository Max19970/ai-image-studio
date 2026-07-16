import { useMemo, useRef, useState } from 'react';
import type { GenerationModel, GenerationProvider } from '../../../domain/providerSettings';
import { useI18n } from '../../../i18n';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BottomSheet, DisclosureChevron, FloatingPopover } from '../../../shared/ui';
import { getProviderForSelectedModel, getSelectedModel } from '../modelOptions';
import { ProviderModelPickerPanel } from './ProviderModelPickerPanel';
import styles from './ProviderModelPicker.module.css';

interface Props {
  value: string;
  models: readonly GenerationModel[];
  providers: readonly GenerationProvider[];
  onChange: (modelId: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  disabled?: boolean;
  minWidth?: number;
  onSelect?: () => void;
  testId?: string;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function ProviderModelPicker({
  value,
  models,
  providers,
  onChange,
  ariaLabel,
  placeholder,
  emptyText,
  className,
  triggerClassName,
  panelClassName,
  disabled = false,
  minWidth = 640,
  onSelect,
  testId
}: Props) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedModel = useMemo(() => getSelectedModel(models, value), [models, value]);
  const selectedProvider = useMemo(() => getProviderForSelectedModel(providers, selectedModel), [providers, selectedModel]);
  const safeEmptyText = emptyText || t('app.warningNoModel');
  const selectedLabel = selectedModel?.name || selectedModel?.modelId || placeholder || '';
  const selectedModelId = selectedModel?.id ?? value;

  const close = () => setOpen(false);
  const selectModel = (modelId: string) => {
    onChange(modelId);
    close();
    onSelect?.();
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const panel = (
    <ProviderModelPickerPanel
      value={selectedModelId}
      models={models}
      providers={providers}
      onChange={selectModel}
      emptyText={safeEmptyText}
      testId="provider-model-picker-panel"
    />
  );

  return (
    <div className={cx(styles.root, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, triggerClassName, open && styles.triggerOpen)}
        aria-label={ariaLabel || t('composer.model')}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={testId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.triggerCopy}>
          <small>{selectedProvider?.name || t('composer.provider')}</small>
          <strong>{selectedLabel || safeEmptyText}</strong>
        </span>
        <DisclosureChevron direction={open ? 'up' : 'down'} className={styles.chevron} />
      </button>

      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={triggerRef}
          className={cx(styles.panel, panelClassName)}
          placement="auto"
          offset={8}
          viewportMargin={12}
          minWidth={minWidth}
          returnFocusOnEscape={false}
          onDismiss={close}
        >
          {panel}
        </FloatingPopover>
      )}

      {isMobile && (
        <BottomSheet
          open={open}
          title={t('composer.modelPickerTitle')}
          description={t('composer.modelPickerDescription')}
          closeLabel={t('attachment.close')}
          size="content"
          compactHeader
          onClose={close}
        >
          {panel}
        </BottomSheet>
      )}
    </div>
  );
}
