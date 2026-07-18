import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export interface GroupedCollectionPosition {
  id: string;
  start: number;
  end: number;
}

export function findActiveGroupedCollectionId(
  positions: readonly GroupedCollectionPosition[],
  offset: number,
  atEnd = false
) {
  if (positions.length === 0) return '';
  if (atEnd) return positions[positions.length - 1].id;

  let activeId = positions[0].id;
  for (const position of positions) {
    if (position.start > offset) break;
    activeId = position.id;
  }
  return activeId;
}

export function useMeasuredGroupedCollection(
  groupIds: readonly string[],
  options: { scrollOffset?: number } = {}
) {
  const scrollOffset = options.scrollOffset ?? 12;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const groupElementsRef = useRef(new Map<string, HTMLElement>());
  const frameRef = useRef(0);
  const [activeGroupId, setActiveGroupId] = useState(groupIds[0] ?? '');

  const readPositions = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return [] as GroupedCollectionPosition[];
    const scrollerRect = scroller.getBoundingClientRect();

    return groupIds.flatMap((id) => {
      const element = groupElementsRef.current.get(id);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      const start = scroller.scrollTop + rect.top - scrollerRect.top;
      return [{ id, start, end: start + rect.height }];
    });
  }, [groupIds]);

  const updateActiveGroup = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const positions = readPositions();
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
    const nextId = findActiveGroupedCollectionId(
      positions,
      scroller.scrollTop + scrollOffset,
      atEnd
    );
    if (nextId) setActiveGroupId((current) => current === nextId ? current : nextId);
  }, [readPositions, scrollOffset]);

  const scheduleActiveGroupUpdate = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateActiveGroup);
  }, [updateActiveGroup]);

  const setGroupElement = useCallback((groupId: string, element: HTMLElement | null) => {
    if (element) groupElementsRef.current.set(groupId, element);
    else groupElementsRef.current.delete(groupId);
    scheduleActiveGroupUpdate();
  }, [scheduleActiveGroupUpdate]);

  const navigateToGroup = useCallback((groupId: string) => {
    const scroller = scrollerRef.current;
    const element = groupElementsRef.current.get(groupId);
    if (!scroller || !element) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const top = Math.max(
      0,
      scroller.scrollTop + elementRect.top - scrollerRect.top - scrollOffset
    );
    setActiveGroupId(groupId);
    scroller.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion, scrollOffset]);

  useEffect(() => {
    const availableIds = new Set(groupIds);
    setActiveGroupId((current) => availableIds.has(current) ? current : groupIds[0] ?? '');
    for (const id of groupElementsRef.current.keys()) {
      if (!availableIds.has(id)) groupElementsRef.current.delete(id);
    }
  }, [groupIds]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateActiveGroup();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(scheduleActiveGroupUpdate);
    observer.observe(scroller);
    groupElementsRef.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [groupIds, scheduleActiveGroupUpdate, updateActiveGroup]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return {
    scrollerRef,
    activeGroupId,
    setGroupElement,
    navigateToGroup,
    scheduleActiveGroupUpdate,
    updateActiveGroup
  };
}
