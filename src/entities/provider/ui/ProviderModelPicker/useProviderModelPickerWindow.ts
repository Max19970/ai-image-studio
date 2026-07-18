import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  findProviderModelPickerRowIndexAtOffset,
  getProviderModelPickerVirtualRange,
  type ProviderModelPickerRowsModel
} from './providerModelPickerModel';

interface ViewportState {
  scrollTop: number;
  height: number;
  direction: -1 | 0 | 1;
  velocity: number;
}

export function useProviderModelPickerWindow(args: {
  rowsModel: ProviderModelPickerRowsModel;
  fallbackGroupId?: string;
  reducedMotion: boolean;
  onActiveGroupChange: (groupId: string) => void;
}) {
  const { rowsModel, fallbackGroupId, reducedMotion, onActiveGroupChange } = args;
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef(0);
  const lastScrollRef = useRef({ top: 0, time: 0 });
  const [viewport, setViewport] = useState<ViewportState>({
    scrollTop: 0,
    height: 360,
    direction: 0,
    velocity: 0
  });

  const virtualRange = useMemo(
    () => getProviderModelPickerVirtualRange({
      rows: rowsModel.rows,
      scrollTop: viewport.scrollTop,
      viewportHeight: viewport.height,
      direction: viewport.direction,
      velocity: viewport.velocity
    }),
    [rowsModel.rows, viewport]
  );
  const visibleRows = useMemo(
    () => rowsModel.rows.slice(virtualRange.startIndex, virtualRange.endIndex),
    [rowsModel.rows, virtualRange.endIndex, virtualRange.startIndex]
  );

  const updateViewport = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const previous = lastScrollRef.current;
    const delta = scroller.scrollTop - previous.top;
    const elapsed = Math.max(1, now - previous.time);
    const direction = delta === 0 ? 0 : delta > 0 ? 1 : -1;
    const velocity = previous.time === 0 ? 0 : Math.min(12, Math.abs(delta) / elapsed);
    lastScrollRef.current = { top: scroller.scrollTop, time: now };

    setViewport((current) => {
      const next: ViewportState = {
        scrollTop: scroller.scrollTop,
        height: scroller.clientHeight,
        direction,
        velocity
      };
      if (
        current.scrollTop === next.scrollTop
        && current.height === next.height
        && current.direction === next.direction
        && Math.abs(current.velocity - next.velocity) < 0.02
      ) return current;
      return next;
    });

    const rowIndex = findProviderModelPickerRowIndexAtOffset(rowsModel.rows, scroller.scrollTop + 12);
    const groupId = rowIndex >= 0 ? rowsModel.rows[rowIndex]?.groupId : fallbackGroupId;
    if (groupId) onActiveGroupChange(groupId);
  }, [fallbackGroupId, onActiveGroupChange, rowsModel.rows]);

  const scheduleViewportUpdate = useCallback(() => {
    cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(updateViewport);
  }, [updateViewport]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateViewport();
    const observer = new ResizeObserver(scheduleViewportUpdate);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scheduleViewportUpdate, updateViewport]);

  useEffect(() => () => cancelAnimationFrame(scrollFrameRef.current), []);

  const scrollToGroup = useCallback((groupId: string) => {
    const scroller = scrollerRef.current;
    const offset = rowsModel.groupOffsets.get(groupId);
    if (!scroller || offset === undefined) return;
    onActiveGroupChange(groupId);
    scroller.scrollTo({ top: Math.max(0, offset - 2), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [onActiveGroupChange, reducedMotion, rowsModel.groupOffsets]);

  const revealModel = useCallback((modelId: string, align: 'nearest' | 'start' = 'nearest') => {
    const scroller = scrollerRef.current;
    const rowIndex = rowsModel.modelRowIndexes.get(modelId);
    const row = rowIndex === undefined ? undefined : rowsModel.rows[rowIndex];
    if (!scroller || !row) return false;

    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    let nextTop = viewTop;
    if (align === 'start') nextTop = Math.max(0, row.start - 8);
    else if (row.start < viewTop + 8) nextTop = Math.max(0, row.start - 8);
    else if (row.end > viewBottom - 8) nextTop = Math.max(0, row.end - scroller.clientHeight + 8);

    if (nextTop !== viewTop) scroller.scrollTop = nextTop;
    lastScrollRef.current = { top: scroller.scrollTop, time: 0 };
    updateViewport();
    return true;
  }, [rowsModel.modelRowIndexes, rowsModel.rows, updateViewport]);

  const resetScroll = useCallback((modelId?: string) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const rowIndex = modelId ? rowsModel.modelRowIndexes.get(modelId) : undefined;
    const groupId = rowIndex === undefined ? undefined : rowsModel.rows[rowIndex]?.groupId;
    const groupOffset = groupId ? rowsModel.groupOffsets.get(groupId) : undefined;
    scroller.scrollTop = Math.max(0, groupOffset ?? 0);
    lastScrollRef.current = { top: scroller.scrollTop, time: 0 };
    updateViewport();
  }, [rowsModel.groupOffsets, rowsModel.modelRowIndexes, rowsModel.rows, updateViewport]);

  const visibleModelCount = visibleRows.reduce(
    (count, row) => count + (row.kind === 'model' ? 1 : 0),
    0
  );

  return {
    scrollerRef,
    visibleRows,
    visibleModelCount,
    scheduleViewportUpdate,
    scrollToGroup,
    revealModel,
    resetScroll,
    updateViewport
  };
}
