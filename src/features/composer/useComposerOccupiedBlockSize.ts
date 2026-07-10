import { useLayoutEffect, useRef } from 'react';

export function useComposerOccupiedBlockSize() {
  const dockRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock || typeof ResizeObserver === 'undefined') return;
    const app = dock.closest<HTMLElement>('.studio-app');
    if (!app) return;

    const updateOccupiedSize = () => {
      app.style.setProperty('--composer-occupied-block-size', `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    };
    const observer = new ResizeObserver(updateOccupiedSize);
    observer.observe(dock);
    updateOccupiedSize();
    window.addEventListener('resize', updateOccupiedSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOccupiedSize);
      app.style.removeProperty('--composer-occupied-block-size');
    };
  }, []);

  return dockRef;
}
