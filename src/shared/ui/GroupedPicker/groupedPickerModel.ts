export type GroupedPickerDensity = 'compact' | 'comfortable';

export interface GroupedPickerItem {
  id: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
  disabled?: boolean;
}

export interface GroupedPickerGroup {
  id: string;
  label: string;
  description?: string;
  items: readonly GroupedPickerItem[];
  disabled?: boolean;
}

interface IndexedGroupedPickerItem {
  item: GroupedPickerItem;
  searchText: string;
}

export interface IndexedGroupedPickerGroup {
  group: GroupedPickerGroup;
  searchText: string;
  items: readonly IndexedGroupedPickerItem[];
}

interface GroupedPickerRowBase {
  key: string;
  index: number;
  groupId: string;
  groupLabel: string;
  start: number;
  size: number;
  end: number;
}

export interface GroupedPickerGroupRow extends GroupedPickerRowBase {
  kind: 'group';
  itemCount: number;
}

export interface GroupedPickerItemRow extends GroupedPickerRowBase {
  kind: 'item';
  item: GroupedPickerItem;
  itemIndex: number;
}

export type GroupedPickerRow = GroupedPickerGroupRow | GroupedPickerItemRow;

export interface GroupedPickerRowsModel {
  rows: readonly GroupedPickerRow[];
  totalSize: number;
  groupOffsets: ReadonlyMap<string, number>;
  itemRowIndexes: ReadonlyMap<string, number>;
  selectableItemIds: readonly string[];
}

export interface GroupedPickerVirtualRange {
  startIndex: number;
  endIndex: number;
  beforeOverscan: number;
  afterOverscan: number;
}

const densityMetrics: Record<GroupedPickerDensity, { group: number; item: number; groupGap: number }> = {
  compact: { group: 30, item: 46, groupGap: 6 },
  comfortable: { group: 34, item: 52, groupGap: 8 }
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

export function indexGroupedPickerGroups(groups: readonly GroupedPickerGroup[]): readonly IndexedGroupedPickerGroup[] {
  return groups.map((group) => ({
    group,
    searchText: createSearchText([group.label, group.description]),
    items: group.items.map((item) => ({
      item,
      searchText: createSearchText([
        group.label,
        group.description,
        item.label,
        item.description,
        ...(item.keywords ?? [])
      ])
    }))
  }));
}

export function filterGroupedPickerGroups(
  indexedGroups: readonly IndexedGroupedPickerGroup[],
  query: string
): readonly GroupedPickerGroup[] {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return indexedGroups.map(({ group }) => group);

  const matchesAllTokens = (searchText: string) => tokens.every((token) => searchText.includes(token));
  const filtered: GroupedPickerGroup[] = [];

  for (const indexedGroup of indexedGroups) {
    const groupMatches = matchesAllTokens(indexedGroup.searchText);
    const items = groupMatches
      ? indexedGroup.group.items
      : indexedGroup.items.filter(({ searchText }) => matchesAllTokens(searchText)).map(({ item }) => item);

    if (items.length === 0) continue;
    filtered.push({ ...indexedGroup.group, items });
  }

  return filtered;
}

export function buildGroupedPickerRows(
  groups: readonly GroupedPickerGroup[],
  density: GroupedPickerDensity
): GroupedPickerRowsModel {
  const metrics = densityMetrics[density];
  const rows: GroupedPickerRow[] = [];
  const groupOffsets = new Map<string, number>();
  const itemRowIndexes = new Map<string, number>();
  const selectableItemIds: string[] = [];
  let offset = 0;

  for (const group of groups) {
    if (group.items.length === 0) continue;
    if (rows.length > 0) offset += metrics.groupGap;

    groupOffsets.set(group.id, offset);
    rows.push({
      kind: 'group',
      key: `group:${group.id}`,
      index: rows.length,
      groupId: group.id,
      groupLabel: group.label,
      itemCount: group.items.length,
      start: offset,
      size: metrics.group,
      end: offset + metrics.group
    });
    offset += metrics.group;

    group.items.forEach((item, itemIndex) => {
      const rowIndex = rows.length;
      rows.push({
        kind: 'item',
        key: `item:${group.id}:${item.id}`,
        index: rowIndex,
        groupId: group.id,
        groupLabel: group.label,
        item,
        itemIndex,
        start: offset,
        size: metrics.item,
        end: offset + metrics.item
      });
      itemRowIndexes.set(item.id, rowIndex);
      if (!item.disabled && !group.disabled) selectableItemIds.push(item.id);
      offset += metrics.item;
    });
  }

  return { rows, totalSize: offset, groupOffsets, itemRowIndexes, selectableItemIds };
}

export function findGroupedPickerRowIndexAtOffset(rows: readonly GroupedPickerRow[], offset: number) {
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

export function getGroupedPickerVirtualRange(args: {
  rows: readonly GroupedPickerRow[];
  scrollTop: number;
  viewportHeight: number;
  direction: -1 | 0 | 1;
  velocity: number;
}): GroupedPickerVirtualRange {
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
  const startIndex = Math.max(0, findGroupedPickerRowIndexAtOffset(rows, startOffset));
  let endIndex = Math.max(startIndex + 1, findGroupedPickerRowIndexAtOffset(rows, endOffset) + 1);
  endIndex = Math.min(rows.length, endIndex);

  return { startIndex, endIndex, beforeOverscan, afterOverscan };
}
