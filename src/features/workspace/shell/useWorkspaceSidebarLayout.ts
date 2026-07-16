import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const sidebarSizeStorageKey = 'imageStudio.workspace.sidebarSize';
const collapsedSize = 72;
const minimumExpandedSize = 220;
const maximumExpandedSize = 480;
const collapseSnapThreshold = 132;
const keyboardStep = 16;

interface ResizeSession {
  pointerId: number;
  startX: number;
  startSize: number;
  currentSize: number;
  wasCollapsed: boolean;
}

interface UseWorkspaceSidebarLayoutOptions {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveDefaultSize() {
  if (typeof window === 'undefined') return 272;
  if (window.innerWidth <= 1180) return 248;
  return clamp(Math.round(window.innerWidth * .18), 252, 272);
}

function readStoredSize() {
  if (typeof window === 'undefined') return null;
  try {
    const storedValue = window.localStorage.getItem(sidebarSizeStorageKey);
    if (storedValue === null) return null;
    const value = Number(storedValue);
    return Number.isFinite(value) ? clamp(value, minimumExpandedSize, maximumExpandedSize) : null;
  } catch {
    return null;
  }
}

function persistSize(size: number | null) {
  try {
    if (size === null) window.localStorage.removeItem(sidebarSizeStorageKey);
    else window.localStorage.setItem(sidebarSizeStorageKey, String(Math.round(size)));
  } catch {
    // Storage can be unavailable in embedded or privacy-restricted hosts.
  }
}

export function useWorkspaceSidebarLayout({ collapsed, onCollapsedChange }: UseWorkspaceSidebarLayoutOptions) {
  const [expandedSize, setExpandedSize] = useState(() => readStoredSize() ?? resolveDefaultSize());
  const [resizing, setResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingSizeRef = useRef<number | null>(null);
  const expandedSizeRef = useRef(expandedSize);

  const applySize = (size: number) => {
    shellRef.current?.style.setProperty('--workspace-sidebar-expanded-size', `${size}px`);
  };

  const scheduleSize = (size: number) => {
    pendingSizeRef.current = size;
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const pendingSize = pendingSizeRef.current;
      pendingSizeRef.current = null;
      if (pendingSize !== null) {
        applySize(pendingSize);
        resizeHandleRef.current?.setAttribute('aria-valuenow', String(Math.round(pendingSize)));
      }
    });
  };

  const commitSize = (size: number, persist = true) => {
    const nextSize = clamp(size, minimumExpandedSize, maximumExpandedSize);
    expandedSizeRef.current = nextSize;
    setExpandedSize(nextSize);
    applySize(nextSize);
    if (persist) persistSize(nextSize);
  };

  useLayoutEffect(() => {
    applySize(expandedSize);
  }, [expandedSize]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const finishResize = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const finalTransientSize = pendingSizeRef.current ?? session.currentSize;
    pendingSizeRef.current = null;
    resizeSessionRef.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (cancelled) {
      if (session.wasCollapsed) {
        onCollapsedChange(true);
        window.requestAnimationFrame(() => applySize(expandedSizeRef.current));
      } else {
        applySize(expandedSizeRef.current);
      }
      return;
    }

    if (finalTransientSize <= collapseSnapThreshold) {
      onCollapsedChange(true);
      window.requestAnimationFrame(() => applySize(expandedSizeRef.current));
      return;
    }

    commitSize(finalTransientSize);
    onCollapsedChange(false);
  };

  const onResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || resizeSessionRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startSize = collapsed
      ? collapsedSize
      : event.currentTarget.parentElement?.getBoundingClientRect().width ?? expandedSizeRef.current;

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startSize,
      currentSize: startSize,
      wasCollapsed: collapsed
    };
    setResizing(true);

    if (collapsed) {
      applySize(collapsedSize);
      onCollapsedChange(false);
    }
  };

  const onResizePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const nextSize = clamp(session.startSize + event.clientX - session.startX, collapsedSize, maximumExpandedSize);
    session.currentSize = nextSize;
    scheduleSize(nextSize);
  };

  const onResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (collapsed && event.key === 'ArrowLeft') {
      event.preventDefault();
      return;
    }
    if (collapsed && event.key === 'ArrowRight') {
      event.preventDefault();
      onCollapsedChange(false);
      return;
    }

    let nextSize: number | null = null;
    if (event.key === 'ArrowLeft') nextSize = expandedSizeRef.current - keyboardStep;
    if (event.key === 'ArrowRight') nextSize = expandedSizeRef.current + keyboardStep;
    if (event.key === 'Home') nextSize = minimumExpandedSize;
    if (event.key === 'End') nextSize = maximumExpandedSize;
    if (event.key === 'Enter') {
      event.preventDefault();
      onCollapsedChange(!collapsed);
      return;
    }
    if (nextSize === null) return;
    event.preventDefault();
    commitSize(nextSize);
    onCollapsedChange(false);
  };

  const resetSize = () => {
    const nextSize = resolveDefaultSize();
    expandedSizeRef.current = nextSize;
    setExpandedSize(nextSize);
    applySize(nextSize);
    persistSize(null);
    onCollapsedChange(false);
  };

  return {
    shellRef,
    resizeHandleRef,
    ariaSize: collapsed ? collapsedSize : expandedSize,
    resizing,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp: (event: PointerEvent<HTMLDivElement>) => finishResize(event),
    onResizePointerCancel: (event: PointerEvent<HTMLDivElement>) => finishResize(event, true),
    onResizePointerLostCapture: (event: PointerEvent<HTMLDivElement>) => finishResize(event, true),
    onResizeKeyDown,
    resetSize
  };
}
