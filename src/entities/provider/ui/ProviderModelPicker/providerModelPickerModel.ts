import type { ProviderModelGroup, ProviderModelOption } from '../../modelOptions';

export type ProviderModelPickerDensity = 'compact' | 'comfortable';

interface IndexedProviderModel {
  model: ProviderModelOption;
  searchText: string;
}

export interface IndexedProviderModelGroup {
  group: ProviderModelGroup;
  searchText: string;
  models: readonly IndexedProviderModel[];
}

interface ProviderModelPickerRowBase {
  key: string;
  index: number;
  groupId: string;
  groupLabel: string;
  start: number;
  size: number;
  end: number;
}

export interface ProviderModelPickerGroupRow extends ProviderModelPickerRowBase {
  kind: 'group';
  modelCount: number;
}

export interface ProviderModelPickerModelRow extends ProviderModelPickerRowBase {
  kind: 'model';
  model: ProviderModelOption;
  modelIndex: number;
}

export type ProviderModelPickerRow = ProviderModelPickerGroupRow | ProviderModelPickerModelRow;

export interface ProviderModelPickerRowsModel {
  rows: readonly ProviderModelPickerRow[];
  totalSize: number;
  groupOffsets: ReadonlyMap<string, number>;
  modelRowIndexes: ReadonlyMap<string, number>;
  selectableModelIds: readonly string[];
}

export interface ProviderModelPickerVirtualRange {
  startIndex: number;
  endIndex: number;
  beforeOverscan: number;
  afterOverscan: number;
}

const densityMetrics: Record<ProviderModelPickerDensity, { group: number; model: number; groupGap: number }> = {
  compact: { group: 30, model: 46, groupGap: 6 },
  comfortable: { group: 34, model: 52, groupGap: 8 }
};

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

function createSearchText(values: readonly (string | undefined)[]) {
  return normalizeSearchText(values.filter(Boolean).join(' '));
}

export function indexProviderModelGroups(
  groups: readonly ProviderModelGroup[]
): readonly IndexedProviderModelGroup[] {
  return groups.map((group) => ({
    group,
    searchText: createSearchText([group.providerName, group.providerAdapterId]),
    models: group.models.map((model) => ({
      model,
      searchText: createSearchText([
        group.providerName,
        group.providerAdapterId,
        model.label,
        model.description,
        model.modelId
      ])
    }))
  }));
}

export function filterProviderModelGroups(
  indexedGroups: readonly IndexedProviderModelGroup[],
  query: string
): readonly ProviderModelGroup[] {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return indexedGroups.map(({ group }) => group);

  const matchesAllTokens = (searchText: string) => tokens.every((token) => searchText.includes(token));
  const filtered: ProviderModelGroup[] = [];

  for (const indexedGroup of indexedGroups) {
    const groupMatches = matchesAllTokens(indexedGroup.searchText);
    const models = groupMatches
      ? indexedGroup.group.models
      : indexedGroup.models.filter(({ searchText }) => matchesAllTokens(searchText)).map(({ model }) => model);

    if (models.length === 0) continue;
    filtered.push({ ...indexedGroup.group, models });
  }

  return filtered;
}

export function buildProviderModelPickerRows(
  groups: readonly ProviderModelGroup[],
  density: ProviderModelPickerDensity
): ProviderModelPickerRowsModel {
  const metrics = densityMetrics[density];
  const rows: ProviderModelPickerRow[] = [];
  const groupOffsets = new Map<string, number>();
  const modelRowIndexes = new Map<string, number>();
  const selectableModelIds: string[] = [];
  let offset = 0;

  for (const group of groups) {
    if (group.models.length === 0) continue;
    if (rows.length > 0) offset += metrics.groupGap;

    groupOffsets.set(group.providerId, offset);
    rows.push({
      kind: 'group',
      key: `group:${group.providerId}`,
      index: rows.length,
      groupId: group.providerId,
      groupLabel: group.providerName,
      modelCount: group.models.length,
      start: offset,
      size: metrics.group,
      end: offset + metrics.group
    });
    offset += metrics.group;

    group.models.forEach((model, modelIndex) => {
      const rowIndex = rows.length;
      rows.push({
        kind: 'model',
        key: `model:${group.providerId}:${model.value}`,
        index: rowIndex,
        groupId: group.providerId,
        groupLabel: group.providerName,
        model,
        modelIndex,
        start: offset,
        size: metrics.model,
        end: offset + metrics.model
      });
      modelRowIndexes.set(model.value, rowIndex);
      if (!group.disabled) selectableModelIds.push(model.value);
      offset += metrics.model;
    });
  }

  return { rows, totalSize: offset, groupOffsets, modelRowIndexes, selectableModelIds };
}

export function findProviderModelPickerRowIndexAtOffset(
  rows: readonly ProviderModelPickerRow[],
  offset: number
) {
  if (rows.length === 0) return -1;
  let low = 0;
  let high = rows.length - 1;
  let result = rows.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (rows[middle].end >= offset) {
      result = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return result;
}

export function getProviderModelPickerVirtualRange(args: {
  rows: readonly ProviderModelPickerRow[];
  scrollTop: number;
  viewportHeight: number;
  direction: -1 | 0 | 1;
  velocity: number;
}): ProviderModelPickerVirtualRange {
  const { rows, scrollTop, viewportHeight, direction, velocity } = args;
  if (rows.length === 0) {
    return { startIndex: 0, endIndex: 0, beforeOverscan: 0, afterOverscan: 0 };
  }

  const predictiveOverscan = Math.min(2200, Math.max(520, viewportHeight * 0.9 + velocity * 240));
  const passiveOverscan = Math.min(720, Math.max(300, viewportHeight * 0.45));
  const beforeOverscan = direction < 0 ? predictiveOverscan : passiveOverscan;
  const afterOverscan = direction > 0 ? predictiveOverscan : passiveOverscan;
  const startOffset = Math.max(0, scrollTop - beforeOverscan);
  const endOffset = scrollTop + viewportHeight + afterOverscan;
  const startIndex = Math.max(0, findProviderModelPickerRowIndexAtOffset(rows, startOffset));
  let endIndex = Math.max(
    startIndex + 1,
    findProviderModelPickerRowIndexAtOffset(rows, endOffset) + 1
  );
  endIndex = Math.min(rows.length, endIndex);

  return { startIndex, endIndex, beforeOverscan, afterOverscan };
}
