import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DependencyList,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingPopover.module.css';

type Placement = 'auto' | 'bottom-start' | 'bottom-end' | 'bottom-center' | 'top-start' | 'top-end' | 'top-center';
export type FloatingPopoverDismissReason = 'escape' | 'outside-pointer';

interface Props {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  id?: string;
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  placement?: Placement;
  offset?: number;
  viewportMargin?: number;
  matchAnchorWidth?: boolean;
  minWidth?: number;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusOnEscape?: boolean;
  onDismiss?: (reason: FloatingPopoverDismissReason) => void;
}

interface FloatingState {
  style: CSSProperties;
  side: 'top' | 'bottom';
  ready: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useIsomorphicLayoutEffect(callback: () => void | (() => void), deps: DependencyList) {
  useLayoutEffect(callback, deps);
}

function focusWithoutScroll(element: HTMLElement | null | undefined) {
  if (!element) return;
  requestAnimationFrame(() => element.focus({ preventScroll: true }));
}

function resolvePosition(args: {
  anchor: DOMRect;
  panel: DOMRect;
  placement: Placement;
  offset: number;
  margin: number;
  matchAnchorWidth: boolean;
  minWidth?: number;
}): FloatingState {
  const { anchor, panel, placement, offset, margin, matchAnchorWidth, minWidth } = args;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportMaxWidth = Math.max(120, viewportWidth - margin * 2);
  const measuredPanelWidth = panel.width > 0 && panel.width < viewportMaxWidth - 1 ? panel.width : 0;
  const desiredWidth = matchAnchorWidth
    ? anchor.width
    : minWidth ?? (measuredPanelWidth || Math.min(anchor.width, viewportMaxWidth));
  const width = Math.min(Math.max(desiredWidth, minWidth ?? 0, 120), viewportMaxWidth);
  const estimatedHeight = Math.min(panel.height || 220, Math.max(120, viewportHeight - margin * 2));
  const spaceBelow = viewportHeight - anchor.bottom - margin - offset;
  const spaceAbove = anchor.top - margin - offset;

  let preferredSide: 'top' | 'bottom';
  if (placement.startsWith('top')) preferredSide = 'top';
  else if (placement.startsWith('bottom')) preferredSide = 'bottom';
  else preferredSide = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';

  const available = preferredSide === 'bottom' ? spaceBelow : spaceAbove;
  const fallbackAvailable = preferredSide === 'bottom' ? spaceAbove : spaceBelow;
  if (available < 140 && fallbackAvailable > available) {
    preferredSide = preferredSide === 'bottom' ? 'top' : 'bottom';
  }

  const sidePlacement = placement === 'auto' ? `${preferredSide}-start` : placement;
  const align = sidePlacement.endsWith('end') ? 'end' : sidePlacement.endsWith('center') ? 'center' : 'start';

  let left = anchor.left;
  if (align === 'end') left = anchor.right - width;
  if (align === 'center') left = anchor.left + anchor.width / 2 - width / 2;
  left = clamp(left, margin, Math.max(margin, viewportWidth - width - margin));

  const maxHeight = Math.max(
    120,
    preferredSide === 'bottom'
      ? viewportHeight - anchor.bottom - offset - margin
      : anchor.top - offset - margin
  );

  let top = preferredSide === 'bottom'
    ? anchor.bottom + offset
    : anchor.top - Math.min(panel.height || estimatedHeight, maxHeight) - offset;
  top = clamp(top, margin, Math.max(margin, viewportHeight - Math.min(panel.height || estimatedHeight, maxHeight) - margin));

  return {
    side: preferredSide,
    ready: true,
    style: {
      position: 'fixed',
      left,
      top,
      width: matchAnchorWidth || minWidth ? width : undefined,
      minWidth: matchAnchorWidth ? width : minWidth,
      maxWidth: `calc(100vw - ${margin * 2}px)`,
      maxHeight,
      zIndex: 1000,
      visibility: 'visible',
      '--floating-origin-y': preferredSide === 'bottom' ? 'top' : 'bottom',
      '--floating-available-height': `${maxHeight}px`
    } as CSSProperties
  };
}

export function FloatingPopover({
  open,
  anchorRef,
  children,
  className,
  id,
  role,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  placement = 'auto',
  offset = 8,
  viewportMargin = 12,
  matchAnchorWidth = false,
  minWidth,
  initialFocusRef,
  returnFocusOnEscape = true,
  onDismiss
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [floating, setFloating] = useState<FloatingState>({
    side: 'bottom',
    ready: false,
    style: { position: 'fixed', left: 0, top: 0, visibility: 'hidden', zIndex: 1000 }
  });

  const update = () => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    setFloating(resolvePosition({
      anchor: anchor.getBoundingClientRect(),
      panel: panel.getBoundingClientRect(),
      placement,
      offset,
      margin: viewportMargin,
      matchAnchorWidth,
      minWidth
    }));
  };

  const dismiss = (reason: FloatingPopoverDismissReason) => {
    onDismiss?.(reason);
    if (reason === 'escape' && returnFocusOnEscape) focusWithoutScroll(anchorRef.current);
  };

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    update();
  }, [open, placement, offset, viewportMargin, matchAnchorWidth, minWidth, children]);

  useEffect(() => {
    if (!open) return;
    focusWithoutScroll(initialFocusRef?.current);
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      dismiss('outside-pointer');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss('escape');
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);

    const observer = new ResizeObserver(schedule);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (panelRef.current) observer.observe(panelRef.current);

    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, anchorRef, onDismiss, returnFocusOnEscape]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={`${styles.layer} ${className ?? ''}`}
      style={floating.style}
      data-side={floating.side}
      data-ready={floating.ready ? 'true' : 'false'}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          dismiss('escape');
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
}
