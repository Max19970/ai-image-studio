import { useEffect, useState, type RefObject } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function documentIsVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function useGalleryAutoAdvance(tileRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const [canAnimate, setCanAnimate] = useState(() => enabled && !prefersReducedMotion() && documentIsVisible());
  const [isNearViewport, setIsNearViewport] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setCanAnimate(false);
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setCanAnimate(!media.matches && documentIsVisible());

    sync();
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const element = tileRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(Boolean(entry?.isIntersecting)),
      { root: null, rootMargin: '480px 0px', threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, tileRef]);

  return enabled && canAnimate && isNearViewport;
}
