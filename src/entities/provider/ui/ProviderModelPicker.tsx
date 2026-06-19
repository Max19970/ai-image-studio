import { useEffect, useMemo, useRef, useState } from 'react';
import type { GenerationModel, GenerationProvider } from '../../../domain/providerSettings';
import { useI18n } from '../../../i18n';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import { BottomSheet, FloatingPopover } from '../../../shared/ui';
import { getProviderForSelectedModel, getProviderModelGroups, getSelectedModel } from '../modelOptions';
import type { ProviderModelGroup, ProviderModelOption } from '../modelOptions';
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

function firstEnabledProviderId(groups: readonly ProviderModelGroup[]) {
  return groups.find((group) => !group.disabled)?.providerId ?? groups[0]?.providerId ?? '';
}

function resolveActiveProviderId(groups: readonly ProviderModelGroup[], selectedProviderId: string | null | undefined, previous?: string) {
  if (previous && groups.some((group) => group.providerId === previous && !group.disabled)) return previous;
  const selectedGroup = groups.find((group) => group.providerId === selectedProviderId && !group.disabled);
  return selectedGroup?.providerId ?? firstEnabledProviderId(groups);
}

function ProviderButton({ group, active, onClick }: { group: ProviderModelGroup; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cx(styles.providerButton, active && styles.providerButtonActive)}
      aria-pressed={active}
      disabled={group.disabled}
      onClick={onClick}
    >
      <span className={styles.providerCopy}>
        <strong>{group.providerName}</strong>
        <small>{group.providerAdapterId || 'provider'}</small>
      </span>
      <span className={styles.providerCount}>{group.models.length}</span>
    </button>
  );
}

function ModelButton({ option, selected, onClick }: { option: ProviderModelOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cx(styles.modelButton, selected && styles.modelButtonActive)}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
    >
      <span className={styles.modelCopy}>
        <strong>{option.label}</strong>
        <small>{option.modelId}</small>
      </span>
      {selected && <span className={styles.check} aria-hidden="true">•</span>}
    </button>
  );
}

function PickerPanel({
  groups,
  activeProviderId,
  selectedModelId,
  emptyText,
  setActiveProviderId,
  selectModel
}: {
  groups: ProviderModelGroup[];
  activeProviderId: string;
  selectedModelId: string;
  emptyText: string;
  setActiveProviderId: (providerId: string) => void;
  selectModel: (modelId: string) => void;
}) {
  const { t } = useI18n();
  const activeGroup = groups.find((group) => group.providerId === activeProviderId) ?? groups.find((group) => !group.disabled) ?? groups[0] ?? null;

  if (groups.length === 0) {
    return <div className={styles.empty}>{emptyText}</div>;
  }

  return (
    <div className={styles.panelLayout}>
      <section className={styles.providerColumn} aria-label={t('composer.providersList')}>
        <span className={styles.columnTitle}>{t('composer.provider')}</span>
        <div className={styles.providerList}>
          {groups.map((group) => (
            <ProviderButton
              key={group.providerId}
              group={group}
              active={group.providerId === activeProviderId}
              onClick={() => setActiveProviderId(group.providerId)}
            />
          ))}
        </div>
      </section>

      <section className={styles.modelColumn} aria-label={t('composer.modelsList')}>
        <span className={styles.columnTitle}>{activeGroup?.providerName || t('composer.model')}</span>
        <div className={styles.modelList}>
          {activeGroup && activeGroup.models.length > 0 ? activeGroup.models.map((option) => (
            <ModelButton
              key={option.value}
              option={option}
              selected={option.value === selectedModelId}
              onClick={() => selectModel(option.value)}
            />
          )) : <div className={styles.empty}>{t('composer.noProviderModels')}</div>}
        </div>
      </section>
    </div>
  );
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
  minWidth = 340,
  onSelect,
  testId
}: Props) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const [open, setOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedModel = useMemo(() => getSelectedModel(models, value), [models, value]);
  const selectedProvider = useMemo(() => getProviderForSelectedModel(providers, selectedModel), [providers, selectedModel]);
  const groups = useMemo(() => getProviderModelGroups(models, providers, selectedModel?.id ?? value), [models, providers, selectedModel, value]);
  const safeEmptyText = emptyText || t('app.warningNoModel');
  const selectedLabel = selectedModel?.name || selectedModel?.modelId || placeholder || '';
  const selectedModelId = selectedModel?.id ?? value;

  useEffect(() => {
    if (!open) return;
    setActiveProviderId((previous) => resolveActiveProviderId(groups, selectedProvider?.id, previous));
  }, [open, groups, selectedProvider]);

  const close = () => setOpen(false);
  const selectModel = (modelId: string) => {
    onChange(modelId);
    close();
    onSelect?.();
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const panel = (
    <PickerPanel
      groups={groups}
      activeProviderId={activeProviderId || resolveActiveProviderId(groups, selectedProvider?.id)}
      selectedModelId={selectedModelId}
      emptyText={safeEmptyText}
      setActiveProviderId={setActiveProviderId}
      selectModel={selectModel}
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
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.triggerCopy}>
          <small>{selectedProvider?.name || t('composer.provider')}</small>
          <strong>{selectedLabel || safeEmptyText}</strong>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
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
          size="content"
          compactHeader
          scrollHint
          onClose={close}
        >
          {panel}
        </BottomSheet>
      )}
    </div>
  );
}
