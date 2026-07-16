import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  buildGroupedPickerRows,
  filterGroupedPickerGroups,
  indexGroupedPickerGroups,
  type GroupedPickerDensity,
  type GroupedPickerGroup
} from './groupedPickerModel';
import {
  GroupedPickerClearIcon,
  GroupedPickerSearchIcon,
  GroupedPickerVirtualGroupHeader,
  GroupedPickerVirtualItem
} from './GroupedPickerRows';
import { useGroupedPickerNavigation } from './useGroupedPickerNavigation';
import { useGroupedPickerWindow } from './useGroupedPickerWindow';
import chromeStyles from './GroupedPickerChrome.module.css';
import styles from './GroupedPicker.module.css';

export type { GroupedPickerDensity, GroupedPickerGroup, GroupedPickerItem } from './groupedPickerModel';

export interface GroupedPickerProps {
  groups: readonly GroupedPickerGroup[];
  value?: string | null;
  onChange: (itemId: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  clearSearchLabel: string;
  groupNavigationLabel: string;
  itemListLabel: string;
  emptyText: string;
  noResultsText: string;
  className?: string;
  density?: GroupedPickerDensity;
  autoFocusSearch?: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  testId?: string;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function GroupedPicker({
  groups,
  value,
  onChange,
  searchLabel,
  searchPlaceholder,
  clearSearchLabel,
  groupNavigationLabel,
  itemListLabel,
  emptyText,
  noResultsText,
  className,
  density = 'comfortable',
  autoFocusSearch = true,
  searchInputRef,
  testId
}: GroupedPickerProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const localSearchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeGroupId, setActiveGroupId] = useState('');

  const indexedGroups = useMemo(() => indexGroupedPickerGroups(groups), [groups]);
  const filteredGroups = useMemo(
    () => filterGroupedPickerGroups(indexedGroups, deferredQuery),
    [deferredQuery, indexedGroups]
  );
  const rowsModel = useMemo(
    () => buildGroupedPickerRows(filteredGroups, density),
    [density, filteredGroups]
  );
  const groupDisabledById = useMemo(
    () => new Map(filteredGroups.map((group) => [group.id, Boolean(group.disabled)])),
    [filteredGroups]
  );
  const isSearchStale = query !== deferredQuery;
  const hasSourceItems = groups.some((group) => group.items.length > 0);

  const pickerWindow = useGroupedPickerWindow({
    rowsModel,
    fallbackGroupId: filteredGroups[0]?.id,
    reducedMotion,
    onActiveGroupChange: setActiveGroupId
  });
  const navigation = useGroupedPickerNavigation({
    groups: filteredGroups,
    rowsModel,
    value,
    activeGroupId,
    setActiveGroupId,
    query,
    setQuery,
    onChange,
    scrollToGroup: pickerWindow.scrollToGroup,
    revealItem: pickerWindow.revealItem
  });

  const assignSearchRef = useCallback((element: HTMLInputElement | null) => {
    localSearchRef.current = element;
    if (searchInputRef) searchInputRef.current = element;
  }, [searchInputRef]);

  useEffect(() => {
    if (!autoFocusSearch) return;
    requestAnimationFrame(() => localSearchRef.current?.focus({ preventScroll: true }));
  }, [autoFocusSearch]);

  useLayoutEffect(() => {
    pickerWindow.resetScroll(deferredQuery ? undefined : value ?? undefined);
  }, [deferredQuery, pickerWindow.resetScroll, rowsModel, value]);

  return (
    <div
      className={cx(chromeStyles.root, styles[density], className)}
      data-testid={testId}
      data-grouped-picker="true"
      data-total-items={rowsModel.selectableItemIds.length}
      data-rendered-items={pickerWindow.visibleItemCount}
      data-search-stale={isSearchStale ? 'true' : 'false'}
    >
      <div className={chromeStyles.searchBar}>
        <div className={chromeStyles.searchField}>
          <span className={chromeStyles.searchIcon}><GroupedPickerSearchIcon /></span>
          <input
            ref={assignSearchRef}
            type="search"
            value={query}
            aria-label={searchLabel}
            aria-controls={listboxId}
            placeholder={searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={navigation.handleSearchKeyDown}
          />
          <span className={chromeStyles.resultCount} aria-label={`${rowsModel.selectableItemIds.length} ${itemListLabel}`}>
            {rowsModel.selectableItemIds.length}
          </span>
          {query && (
            <button type="button" className={chromeStyles.clearSearch} onClick={() => setQuery('')} aria-label={clearSearchLabel}>
              <GroupedPickerClearIcon />
            </button>
          )}
        </div>
      </div>

      {hasSourceItems && filteredGroups.length > 0 ? (
        <div className={chromeStyles.pickerBody}>
          <nav className={chromeStyles.groupNavigation} aria-label={groupNavigationLabel}>
            <div className={chromeStyles.columnHeader} aria-hidden="true">
              <span>{groupNavigationLabel}</span>
            </div>
            <div className={chromeStyles.groupNavigationScroll}>
              {filteredGroups.map((group) => {
                const active = group.id === navigation.activeGroupId;
                return (
                  <button
                    key={group.id}
                    ref={(element) => navigation.setGroupButtonRef(group.id, element)}
                    type="button"
                    className={styles.groupButton}
                    data-active={active ? 'true' : 'false'}
                    aria-current={active ? 'true' : undefined}
                    aria-controls={listboxId}
                    disabled={group.disabled}
                    tabIndex={active ? 0 : -1}
                    onClick={() => pickerWindow.scrollToGroup(group.id)}
                    onFocus={() => setActiveGroupId(group.id)}
                    onKeyDown={(event) => navigation.handleGroupKeyDown(event, group.id)}
                  >
                    <span className={styles.groupCopy}>
                      <strong>{group.label}</strong>
                      {group.description && <small>{group.description}</small>}
                    </span>
                    <span className={styles.groupCount}>{group.items.length}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <section className={chromeStyles.itemColumn} aria-label={itemListLabel}>
            <div className={chromeStyles.columnHeader} aria-hidden="true">
              <span>{itemListLabel}</span>
            </div>
            <div
              ref={pickerWindow.scrollerRef}
              id={listboxId}
              className={chromeStyles.itemScroller}
              role="listbox"
              aria-label={itemListLabel}
              aria-busy={isSearchStale}
              onScroll={pickerWindow.scheduleViewportUpdate}
            >
              <div className={chromeStyles.virtualCanvas} style={{ height: rowsModel.totalSize }}>
                {pickerWindow.visibleRows.map((row) => (
                  <div
                    key={row.key}
                    className={chromeStyles.virtualRow}
                    data-row-kind={row.kind}
                    style={{ height: row.size, transform: `translateY(${row.start}px)` }}
                  >
                    {row.kind === 'group' ? (
                      <GroupedPickerVirtualGroupHeader row={row} />
                    ) : (
                      <GroupedPickerVirtualItem
                        row={row}
                        selected={row.item.id === value}
                        active={row.item.id === navigation.activeItemId}
                        disabled={Boolean(row.item.disabled || groupDisabledById.get(row.groupId))}
                        setItemRef={navigation.setItemButtonRef}
                        onSelect={navigation.selectItem}
                        onFocus={navigation.setActiveItemId}
                        onKeyDown={navigation.handleItemKeyDown}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.emptyState} role="status">
          <strong>{hasSourceItems ? noResultsText : emptyText}</strong>
          {query && hasSourceItems && (
            <button type="button" onClick={() => setQuery('')}>{clearSearchLabel}</button>
          )}
        </div>
      )}
    </div>
  );
}
