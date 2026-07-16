import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

const treePreferenceKey = 'image-studio.gallery.folder-tree-visible';
const treeWidthPreferenceKey = 'image-studio.gallery.folder-tree-width';

function initialTreeVisibility(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(treePreferenceKey) !== 'false';
}

function initialTreeWidth(): number {
  if (typeof window === 'undefined') return 250;
  const stored = Number(window.localStorage.getItem(treeWidthPreferenceKey));
  return Number.isFinite(stored) ? Math.min(360, Math.max(180, stored)) : 250;
}

export function useGalleryFolderTreeLayout() {
  const [treeVisible, setTreeVisible] = useState(initialTreeVisibility);
  const [treeWidth, setTreeWidth] = useState(initialTreeWidth);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(treePreferenceKey, String(treeVisible));
  }, [treeVisible]);

  useEffect(() => {
    window.localStorage.setItem(treeWidthPreferenceKey, String(treeWidth));
  }, [treeWidth]);

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStart.current = { x: event.clientX, width: treeWidth };
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeStart.current) return;
    const next = resizeStart.current.width + event.clientX - resizeStart.current.x;
    setTreeWidth(Math.min(360, Math.max(180, next)));
  };

  const finishResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStart.current = null;
    setResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return {
    treeVisible,
    resizing,
    toggleTree: () => setTreeVisible((visible) => !visible),
    shellStyle: { '--folder-tree-width': `${treeWidth}px` } as CSSProperties,
    resizeHandleProps: {
      onPointerDown: beginResize,
      onPointerMove: resize,
      onPointerUp: finishResize,
      onPointerCancel: finishResize
    }
  };
}
