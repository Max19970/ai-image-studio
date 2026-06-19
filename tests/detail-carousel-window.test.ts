import test from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleCarouselSlides } from '../src/features/detail/sections/carousel/carouselWindow';

function compact<T>(slides: T[], activeIndex: number) {
  return getVisibleCarouselSlides(slides, activeIndex).map((item) => ({ index: item.index, placement: item.placement, slide: item.slide }));
}

test('detail carousel window returns no slides for an empty carousel', () => {
  assert.deepEqual(compact([], 0), []);
});

test('detail carousel window keeps only the active slide for a single slide', () => {
  assert.deepEqual(compact(['a'], 0), [{ index: 0, placement: 'active', slide: 'a' }]);
});

test('detail carousel window preserves two-slide behavior without duplicate prev/next DOM nodes', () => {
  assert.deepEqual(compact(['a', 'b'], 0), [
    { index: 0, placement: 'active', slide: 'a' },
    { index: 1, placement: 'prev', slide: 'b' }
  ]);

  assert.deepEqual(compact(['a', 'b'], 1), [
    { index: 0, placement: 'prev', slide: 'a' },
    { index: 1, placement: 'active', slide: 'b' }
  ]);
});

test('detail carousel window renders only prev, active and next for a large carousel', () => {
  const slides = Array.from({ length: 80 }, (_, index) => `slide-${index}`);

  assert.deepEqual(compact(slides, 42), [
    { index: 41, placement: 'prev', slide: 'slide-41' },
    { index: 42, placement: 'active', slide: 'slide-42' },
    { index: 43, placement: 'next', slide: 'slide-43' }
  ]);
});

test('detail carousel window wraps around edges and keeps pending slides eligible when adjacent', () => {
  const slides = ['image-0', 'image-1', 'pending'];

  assert.deepEqual(compact(slides, 0), [
    { index: 0, placement: 'active', slide: 'image-0' },
    { index: 1, placement: 'next', slide: 'image-1' },
    { index: 2, placement: 'prev', slide: 'pending' }
  ]);

  assert.deepEqual(compact(slides, 1), [
    { index: 0, placement: 'prev', slide: 'image-0' },
    { index: 1, placement: 'active', slide: 'image-1' },
    { index: 2, placement: 'next', slide: 'pending' }
  ]);
});
