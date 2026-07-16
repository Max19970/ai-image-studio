import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction
} from 'react';
import type {
  GroupedPickerGroup,
  GroupedPickerItemRow,
  GroupedPickerRowsModel
} from './groupedPickerModel';

export function useGroupedPickerNavigation(args: {
  groups: readonly GroupedPickerGroup[];
  rowsModel: GroupedPickerRowsModel;
  value?: string | null;
  activeGroupId: string;
  setActiveGroupId: Dispatch<SetStateAction<string>>;
  query: string;
  setQuery: (query: string) => void;
  onChange: (itemId: string) => void;
  scrollToGroup: (groupId: string) => void;
  revealItem: (itemId: string, align?: 'nearest' | 'start') => boolean;
}) {
  const {
    groups,
    rowsModel,
    value,
    activeGroupId,
    setActiveGroupId,
    query,
    setQuery,
    onChange,
    scrollToGroup,
    revealItem
  } = args;
  const groupButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const itemButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [activeItemId, setActiveItemId] = useState(value ?? '');
  const enabledGroupIds = useMemo(
    () => groups
      .filter((group) => !group.disabled && group.items.some((item) => !item.disabled))
      .map((group) => group.id),
    [groups]
  );
  const selectableItemSet = useMemo(() => new Set(rowsModel.selectableItemIds), [rowsModel.selectableItemIds]);

  const setGroupButtonRef = useCallback((groupId: string, element: HTMLButtonElement | null) => {
    if (element) groupButtonRefs.current.set(groupId, element);
    else groupButtonRefs.current.delete(groupId);
  }, []);

  const setItemButtonRef = useCallback((itemId: string, element: HTMLButtonElement | null) => {
    if (element) itemButtonRefs.current.set(itemId, element);
    else itemButtonRefs.current.delete(itemId);
  }, []);

  useEffect(() => {
    const availableGroupIds = new Set(groups.map((group) => group.id));
    const selectedGroup = groups.find((group) => group.items.some((item) => item.id === value));
    setActiveGroupId((current) => {
      if (availableGroupIds.has(current)) return current;
      if (selectedGroup && !selectedGroup.disabled) return selectedGroup.id;
      return enabledGroupIds[0] ?? groups[0]?.id ?? '';
    });
  }, [enabledGroupIds, groups, value]);

  useEffect(() => {
    setActiveItemId((current) => {
      if (selectableItemSet.has(current)) return current;
      if (value && selectableItemSet.has(value)) return value;
      return rowsModel.selectableItemIds[0] ?? '';
    });
  }, [rowsModel.selectableItemIds, selectableItemSet, value]);

  const focusItem = useCallback((itemId: string) => {
    if (!revealItem(itemId)) return;
    setActiveItemId(itemId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => itemButtonRefs.current.get(itemId)?.focus({ preventScroll: true }));
    });
  }, [revealItem]);

  const focusGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    scrollToGroup(groupId);
    requestAnimationFrame(() => groupButtonRefs.current.get(groupId)?.focus({ preventScroll: true }));
  }, [scrollToGroup]);

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const target = value && selectableItemSet.has(value) ? value : rowsModel.selectableItemIds[0];
      if (target) focusItem(target);
    } else if (event.key === 'Enter' && rowsModel.selectableItemIds.length === 1) {
      event.preventDefault();
      onChange(rowsModel.selectableItemIds[0]);
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
    }
  }, [focusItem, onChange, query, rowsModel.selectableItemIds, selectableItemSet, setQuery, value]);

  const handleGroupKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, groupId: string) => {
    const currentIndex = Math.max(0, enabledGroupIds.indexOf(groupId));
    let targetIndex = currentIndex;
    if (event.key === 'ArrowDown') targetIndex = Math.min(enabledGroupIds.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') targetIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = enabledGroupIds.length - 1;
    else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const group = groups.find((candidate) => candidate.id === groupId);
      const item = group?.items.find((candidate) => !candidate.disabled);
      if (item) focusItem(item.id);
      return;
    } else return;

    event.preventDefault();
    const target = enabledGroupIds[targetIndex];
    if (target) focusGroup(target);
  }, [enabledGroupIds, focusGroup, focusItem, groups]);

  const handleItemKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, row: GroupedPickerItemRow) => {
    const itemIds = rowsModel.selectableItemIds;
    const currentIndex = Math.max(0, itemIds.indexOf(row.item.id));
    let targetIndex = currentIndex;
    if (event.key === 'ArrowDown') targetIndex = Math.min(itemIds.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') targetIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'PageDown') targetIndex = Math.min(itemIds.length - 1, currentIndex + 8);
    else if (event.key === 'PageUp') targetIndex = Math.max(0, currentIndex - 8);
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = itemIds.length - 1;
    else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      groupButtonRefs.current.get(row.groupId)?.focus({ preventScroll: true });
      return;
    } else return;

    event.preventDefault();
    const target = itemIds[targetIndex];
    if (target) focusItem(target);
  }, [focusItem, rowsModel.selectableItemIds]);

  return {
    activeGroupId,
    activeItemId,
    setActiveItemId,
    setGroupButtonRef,
    setItemButtonRef,
    handleSearchKeyDown,
    handleGroupKeyDown,
    handleItemKeyDown,
    selectItem: onChange
  };
}
