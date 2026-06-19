import { useLayoutEffect, type RefObject } from 'react';

type Overflow = 'auto' | 'hidden';

export type AutosizedTextareaInput = {
  scrollHeight: number;
  lineHeightPx: number;
  paddingBlockPx: number;
  borderBlockPx: number;
  focused: boolean;
  collapsedRows: number;
  focusedMinRows: number;
  focusedMaxRows: number;
};

export type AutosizedTextareaResult = {
  heightPx: number;
  overflowY: Overflow;
  overflowX: Overflow;
};

export type AutosizedTextareaOptions = {
  value: string;
  focused: boolean;
  collapsedRows?: number;
  focusedMinRows: number;
  focusedMaxRows: number;
};

const DEFAULT_COLLAPSED_ROWS = 1;

function clampRows(rows: number, fallback: number) {
  return Number.isFinite(rows) && rows > 0 ? rows : fallback;
}

function rowHeightToBlockHeight(rowCount: number, lineHeightPx: number, paddingBlockPx: number, borderBlockPx: number) {
  return rowCount * lineHeightPx + paddingBlockPx + borderBlockPx;
}

export function calculateAutosizedTextareaLayout(input: AutosizedTextareaInput): AutosizedTextareaResult {
  const collapsedRows = clampRows(input.collapsedRows, DEFAULT_COLLAPSED_ROWS);
  const focusedMinRows = clampRows(input.focusedMinRows, collapsedRows);
  const focusedMaxRows = Math.max(clampRows(input.focusedMaxRows, focusedMinRows), focusedMinRows);
  const lineHeightPx = Math.max(input.lineHeightPx, 1);
  const paddingBlockPx = Math.max(input.paddingBlockPx, 0);
  const borderBlockPx = Math.max(input.borderBlockPx, 0);
  const scrollHeight = Math.max(input.scrollHeight, 0) + borderBlockPx;

  const collapsedHeight = rowHeightToBlockHeight(collapsedRows, lineHeightPx, paddingBlockPx, borderBlockPx);

  if (!input.focused) {
    return {
      heightPx: collapsedHeight,
      overflowY: 'hidden',
      overflowX: 'hidden'
    };
  }

  const minFocusedHeight = rowHeightToBlockHeight(focusedMinRows, lineHeightPx, paddingBlockPx, borderBlockPx);
  const maxFocusedHeight = rowHeightToBlockHeight(focusedMaxRows, lineHeightPx, paddingBlockPx, borderBlockPx);
  const heightPx = Math.min(Math.max(scrollHeight, minFocusedHeight), maxFocusedHeight);

  return {
    heightPx,
    overflowY: scrollHeight > maxFocusedHeight ? 'auto' : 'hidden',
    overflowX: 'hidden'
  };
}

function readPx(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readLineHeightPx(styles: CSSStyleDeclaration) {
  const lineHeight = readPx(styles.lineHeight);
  if (lineHeight > 0) {
    return lineHeight;
  }

  const fontSize = readPx(styles.fontSize);
  return fontSize > 0 ? fontSize * 1.2 : 18;
}

export function useAutosizedTextarea(ref: RefObject<HTMLTextAreaElement | null>, options: AutosizedTextareaOptions) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) {
      return;
    }

    const previousScrollTop = textarea.scrollTop;
    textarea.style.height = 'auto';

    const styles = window.getComputedStyle(textarea);
    const layout = calculateAutosizedTextareaLayout({
      scrollHeight: textarea.scrollHeight,
      lineHeightPx: readLineHeightPx(styles),
      paddingBlockPx: readPx(styles.paddingTop) + readPx(styles.paddingBottom),
      borderBlockPx: readPx(styles.borderTopWidth) + readPx(styles.borderBottomWidth),
      focused: options.focused,
      collapsedRows: options.collapsedRows ?? DEFAULT_COLLAPSED_ROWS,
      focusedMinRows: options.focusedMinRows,
      focusedMaxRows: options.focusedMaxRows
    });

    textarea.style.height = `${Math.ceil(layout.heightPx)}px`;
    textarea.style.overflowY = layout.overflowY;
    textarea.style.overflowX = layout.overflowX;
    textarea.scrollTop = options.focused ? previousScrollTop : 0;
  }, [ref, options.value, options.focused, options.collapsedRows, options.focusedMinRows, options.focusedMaxRows]);
}
