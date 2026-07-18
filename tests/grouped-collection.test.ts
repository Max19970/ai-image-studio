import test from 'node:test';
import assert from 'node:assert/strict';
import { findActiveGroupedCollectionId } from '../src/shared/ui/GroupedCollection/useMeasuredGroupedCollection';

const positions = [
  { id: 'frame', start: 0, end: 180 },
  { id: 'render', start: 180, end: 460 },
  { id: 'output', start: 460, end: 720 }
];

test('grouped collection resolves the section nearest the viewport start', () => {
  assert.equal(findActiveGroupedCollectionId(positions, 0), 'frame');
  assert.equal(findActiveGroupedCollectionId(positions, 179), 'frame');
  assert.equal(findActiveGroupedCollectionId(positions, 180), 'render');
  assert.equal(findActiveGroupedCollectionId(positions, 600), 'output');
});

test('grouped collection selects the final section at the scroll boundary', () => {
  assert.equal(findActiveGroupedCollectionId(positions, 200, true), 'output');
  assert.equal(findActiveGroupedCollectionId([], 0, true), '');
});
