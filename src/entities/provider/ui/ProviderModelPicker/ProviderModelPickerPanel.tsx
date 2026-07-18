import {
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { GenerationModel, GenerationProvider } from '../../../../domain/providerSettings';
import { useI18n } from '../../../../i18n';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { GroupedCollection } from '../../../../shared/ui';
import { getProviderModelGroups, getSelectedModel } from '../../modelOptions';
import {
  buildProviderModelPickerRows,
  filterProviderModelGroups,
  indexProviderModelGroups,
  type ProviderModelPickerDensity
} from './providerModelPickerModel';
import {
  ProviderModelClearIcon,
  ProviderModelGroupHeader,
  ProviderModelOption,
  ProviderModelSearchIcon
} from './ProviderModelPickerRows';
import { useProviderModelPickerNavigation } from './useProviderModelPickerNavigation';
import { useProviderModelPickerWindow } from './useProviderModelPickerWindow';
import styles from './ProviderModelPicker.module.css';

export interface ProviderModelPickerPanelProps {
  value: string;
  models: readonly GenerationModel[];
  providers: readonly GenerationProvider[];
  onChange: (modelId: string) => void;
  emptyText?: string;
  className?: string;
  density?: ProviderModelPickerDensity;
  autoFocusSearch?: boolean;
  testId?: string;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function ProviderModelPickerPanel({
  value,
  models,
  providers,
  onChange,
  emptyText,
  className,
  density = 'comfortable',
  autoFocusSearch = true,
  testId
}: ProviderModelPickerPanelProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const listboxId = `${generatedId}-models-listbox`;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeGroupId, setActiveGroupId] = useState('');

  const selectedModel = useMemo(() => getSelectedModel(models, value), [models, value]);
  const selectedModelId = selectedModel?.id ?? value;
  const groups = useMemo(
    () => getProviderModelGroups(models, providers, selectedModelId),
    [models, providers, selectedModelId]
  );
  const indexedGroups = useMemo(() => indexProviderModelGroups(groups), [groups]);
  const filteredGroups = useMemo(
    () => filterProviderModelGroups(indexedGroups, deferredQuery),
    [deferredQuery, indexedGroups]
  );
  const rowsModel = useMemo(
    () => buildProviderModelPickerRows(filteredGroups, density),
    [density, filteredGroups]
  );
  const isSearchStale = query !== deferredQuery;
  const hasSourceModels = groups.some((group) => group.models.length > 0);

  const pickerWindow = useProviderModelPickerWindow({
    rowsModel,
    fallbackGroupId: filteredGroups[0]?.providerId,
    reducedMotion,
    onActiveGroupChange: setActiveGroupId
  });
  const navigation = useProviderModelPickerNavigation({
    groups: filteredGroups,
    rowsModel,
    value: selectedModelId,
    activeGroupId,
    setActiveGroupId,
    query,
    setQuery,
    onChange,
    scrollToGroup: pickerWindow.scrollToGroup,
    revealModel: pickerWindow.revealModel
  });

  useEffect(() => {
    if (!autoFocusSearch) return;
    requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
  }, [autoFocusSearch]);

  useLayoutEffect(() => {
    pickerWindow.resetScroll(deferredQuery ? undefined : selectedModelId);
  }, [deferredQuery, pickerWindow.resetScroll, rowsModel, selectedModelId]);

  return (
    <div
      className={cx(styles.root, styles[density], className)}
      data-testid={testId}
      data-provider-model-picker="true"
      data-total-models={rowsModel.selectableModelIds.length}
      data-rendered-models={pickerWindow.visibleModelCount}
      data-total-items={rowsModel.selectableModelIds.length}
      data-rendered-items={pickerWindow.visibleModelCount}
      data-search-stale={isSearchStale ? 'true' : 'false'}
    >
      <div className={styles.searchBar}>
        <div className={styles.searchField}>
          <span className={styles.searchIcon}><ProviderModelSearchIcon /></span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            aria-label={t('composer.modelSearchLabel')}
            aria-controls={listboxId}
            placeholder={t('composer.modelSearchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={navigation.handleSearchKeyDown}
          />
          <span
            className={styles.resultCount}
            aria-label={`${rowsModel.selectableModelIds.length} ${t('composer.modelsList')}`}
          >
            {rowsModel.selectableModelIds.length}
          </span>
          {query && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setQuery('')}
              aria-label={t('composer.clearModelSearch')}
            >
              <ProviderModelClearIcon />
            </button>
          )}
        </div>
      </div>

      {hasSourceModels && filteredGroups.length > 0 ? (
        <GroupedCollection.Root className={styles.collection}>
          <GroupedCollection.Navigation
            className={styles.groupNavigation}
            listClassName={styles.groupNavigationList}
            label={t('composer.providersList')}
            header={(
              <div className={styles.columnHeader} aria-hidden="true">
                <span>{t('composer.providersList')}</span>
              </div>
            )}
          >
            {filteredGroups.map((group) => {
              const active = group.providerId === navigation.activeGroupId;
              return (
                <GroupedCollection.NavigationItem
                  key={group.providerId}
                  ref={(element) => navigation.setGroupButtonRef(group.providerId, element)}
                  active={active}
                  className={styles.groupButton}
                  aria-controls={listboxId}
                  disabled={group.disabled}
                  tabIndex={active ? 0 : -1}
                  onClick={() => pickerWindow.scrollToGroup(group.providerId)}
                  onFocus={() => setActiveGroupId(group.providerId)}
                  onKeyDown={(event) => navigation.handleGroupKeyDown(event, group.providerId)}
                >
                  <span className={styles.groupCopy}>
                    <strong>{group.providerName}</strong>
                    {group.providerAdapterId && <small>{group.providerAdapterId}</small>}
                  </span>
                  <span className={styles.groupCount}>{group.models.length}</span>
                </GroupedCollection.NavigationItem>
              );
            })}
          </GroupedCollection.Navigation>

          <GroupedCollection.Content className={styles.modelColumn} label={t('composer.modelsList')}>
            <div className={styles.columnHeader} aria-hidden="true">
              <span>{t('composer.modelsList')}</span>
            </div>
            <div
              ref={pickerWindow.scrollerRef}
              id={listboxId}
              className={styles.modelScroller}
              role="listbox"
              aria-label={t('composer.modelsList')}
              aria-busy={isSearchStale}
              onScroll={pickerWindow.scheduleViewportUpdate}
            >
              <div className={styles.virtualCanvas} style={{ height: rowsModel.totalSize }}>
                {pickerWindow.visibleRows.map((row) => (
                  <div
                    key={row.key}
                    className={styles.virtualRow}
                    data-row-kind={row.kind}
                    style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                  >
                    {row.kind === 'group' ? (
                      <ProviderModelGroupHeader row={row} />
                    ) : (
                      <ProviderModelOption
                        row={row}
                        selected={row.model.value === selectedModelId}
                        active={row.model.value === navigation.activeModelId}
                        disabled={Boolean(filteredGroups.find((group) => group.providerId === row.groupId)?.disabled)}
                        setModelRef={navigation.setModelButtonRef}
                        onSelect={navigation.selectModel}
                        onFocus={navigation.setActiveModelId}
                        onKeyDown={navigation.handleModelKeyDown}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </GroupedCollection.Content>
        </GroupedCollection.Root>
      ) : (
        <div className={styles.emptyState} role="status">
          <strong>{hasSourceModels ? t('composer.modelSearchEmpty') : emptyText || t('app.warningNoModel')}</strong>
          {query && hasSourceModels && (
            <button type="button" onClick={() => setQuery('')}>{t('composer.clearModelSearch')}</button>
          )}
        </div>
      )}
    </div>
  );
}
