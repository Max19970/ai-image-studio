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
import type { ProviderModelGroup } from '../../modelOptions';
import type {
  ProviderModelPickerModelRow,
  ProviderModelPickerRowsModel
} from './providerModelPickerModel';

export function useProviderModelPickerNavigation(args: {
  groups: readonly ProviderModelGroup[];
  rowsModel: ProviderModelPickerRowsModel;
  value?: string | null;
  activeGroupId: string;
  setActiveGroupId: Dispatch<SetStateAction<string>>;
  query: string;
  setQuery: (query: string) => void;
  onChange: (modelId: string) => void;
  scrollToGroup: (groupId: string) => void;
  revealModel: (modelId: string, align?: 'nearest' | 'start') => boolean;
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
    revealModel
  } = args;
  const groupButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const modelButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [activeModelId, setActiveModelId] = useState(value ?? '');
  const enabledGroupIds = useMemo(
    () => groups
      .filter((group) => !group.disabled && group.models.length > 0)
      .map((group) => group.providerId),
    [groups]
  );
  const selectableModelSet = useMemo(
    () => new Set(rowsModel.selectableModelIds),
    [rowsModel.selectableModelIds]
  );

  const setGroupButtonRef = useCallback((groupId: string, element: HTMLButtonElement | null) => {
    if (element) groupButtonRefs.current.set(groupId, element);
    else groupButtonRefs.current.delete(groupId);
  }, []);

  const setModelButtonRef = useCallback((modelId: string, element: HTMLButtonElement | null) => {
    if (element) modelButtonRefs.current.set(modelId, element);
    else modelButtonRefs.current.delete(modelId);
  }, []);

  useEffect(() => {
    const availableGroupIds = new Set(groups.map((group) => group.providerId));
    const selectedGroup = groups.find((group) => group.models.some((model) => model.value === value));
    setActiveGroupId((current) => {
      if (availableGroupIds.has(current)) return current;
      if (selectedGroup && !selectedGroup.disabled) return selectedGroup.providerId;
      return enabledGroupIds[0] ?? groups[0]?.providerId ?? '';
    });
  }, [enabledGroupIds, groups, setActiveGroupId, value]);

  useEffect(() => {
    setActiveModelId((current) => {
      if (selectableModelSet.has(current)) return current;
      if (value && selectableModelSet.has(value)) return value;
      return rowsModel.selectableModelIds[0] ?? '';
    });
  }, [rowsModel.selectableModelIds, selectableModelSet, value]);

  const focusModel = useCallback((modelId: string) => {
    if (!revealModel(modelId)) return;
    setActiveModelId(modelId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modelButtonRefs.current.get(modelId)?.focus({ preventScroll: true }));
    });
  }, [revealModel]);

  const focusGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    scrollToGroup(groupId);
    requestAnimationFrame(() => groupButtonRefs.current.get(groupId)?.focus({ preventScroll: true }));
  }, [scrollToGroup, setActiveGroupId]);

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const target = value && selectableModelSet.has(value) ? value : rowsModel.selectableModelIds[0];
      if (target) focusModel(target);
    } else if (event.key === 'Enter' && rowsModel.selectableModelIds.length === 1) {
      event.preventDefault();
      onChange(rowsModel.selectableModelIds[0]);
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
    }
  }, [focusModel, onChange, query, rowsModel.selectableModelIds, selectableModelSet, setQuery, value]);

  const handleGroupKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, groupId: string) => {
    const currentIndex = Math.max(0, enabledGroupIds.indexOf(groupId));
    let targetIndex = currentIndex;
    if (event.key === 'ArrowDown') targetIndex = Math.min(enabledGroupIds.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') targetIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = enabledGroupIds.length - 1;
    else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const group = groups.find((candidate) => candidate.providerId === groupId);
      const model = group?.models[0];
      if (model) focusModel(model.value);
      return;
    } else return;

    event.preventDefault();
    const target = enabledGroupIds[targetIndex];
    if (target) focusGroup(target);
  }, [enabledGroupIds, focusGroup, focusModel, groups]);

  const handleModelKeyDown = useCallback((
    event: KeyboardEvent<HTMLButtonElement>,
    row: ProviderModelPickerModelRow
  ) => {
    const modelIds = rowsModel.selectableModelIds;
    const currentIndex = Math.max(0, modelIds.indexOf(row.model.value));
    let targetIndex = currentIndex;
    if (event.key === 'ArrowDown') targetIndex = Math.min(modelIds.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') targetIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'PageDown') targetIndex = Math.min(modelIds.length - 1, currentIndex + 8);
    else if (event.key === 'PageUp') targetIndex = Math.max(0, currentIndex - 8);
    else if (event.key === 'Home') targetIndex = 0;
    else if (event.key === 'End') targetIndex = modelIds.length - 1;
    else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      groupButtonRefs.current.get(row.groupId)?.focus({ preventScroll: true });
      return;
    } else return;

    event.preventDefault();
    const target = modelIds[targetIndex];
    if (target) focusModel(target);
  }, [focusModel, rowsModel.selectableModelIds]);

  return {
    activeGroupId,
    activeModelId,
    setActiveModelId,
    setGroupButtonRef,
    setModelButtonRef,
    handleSearchKeyDown,
    handleGroupKeyDown,
    handleModelKeyDown,
    selectModel: onChange
  };
}
