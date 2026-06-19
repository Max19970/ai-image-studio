import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAutosizedTextareaLayout } from '../src/shared/hooks/useAutosizedTextarea';

const metrics = {
  lineHeightPx: 20,
  paddingBlockPx: 24,
  borderBlockPx: 2,
  collapsedRows: 1,
  focusedMinRows: 5,
  focusedMaxRows: 7
};

test('autosized textarea collapses to a single row when not focused', () => {
  const layout = calculateAutosizedTextareaLayout({
    ...metrics,
    focused: false,
    scrollHeight: 500
  });

  assert.equal(layout.heightPx, 46);
  assert.equal(layout.overflowY, 'hidden');
  assert.equal(layout.overflowX, 'hidden');
});

test('autosized textarea opens to the focused minimum row count', () => {
  const layout = calculateAutosizedTextareaLayout({
    ...metrics,
    focused: true,
    scrollHeight: 40
  });

  assert.equal(layout.heightPx, 126);
  assert.equal(layout.overflowY, 'hidden');
  assert.equal(layout.overflowX, 'hidden');
});

test('autosized textarea caps focused content and enables internal scroll', () => {
  const layout = calculateAutosizedTextareaLayout({
    ...metrics,
    focused: true,
    scrollHeight: 260
  });

  assert.equal(layout.heightPx, 166);
  assert.equal(layout.overflowY, 'auto');
  assert.equal(layout.overflowX, 'hidden');
});
