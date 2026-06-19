export type CarouselSlidePlacement = 'active' | 'prev' | 'next';

export interface VisibleCarouselSlide<TSlide> {
  slide: TSlide;
  index: number;
  placement: CarouselSlidePlacement;
}

function normalizeSlideIndex(index: number, slideCount: number) {
  return ((index % slideCount) + slideCount) % slideCount;
}

export function getVisibleCarouselSlides<TSlide>(slides: readonly TSlide[], activeIndex: number): Array<VisibleCarouselSlide<TSlide>> {
  if (slides.length === 0) return [];

  const normalizedActiveIndex = normalizeSlideIndex(activeIndex, slides.length);
  const visibleByIndex = new Map<number, CarouselSlidePlacement>();

  visibleByIndex.set(normalizedActiveIndex, 'active');

  if (slides.length > 1) {
    visibleByIndex.set(normalizeSlideIndex(normalizedActiveIndex - 1, slides.length), 'prev');
  }

  if (slides.length > 2) {
    visibleByIndex.set(normalizeSlideIndex(normalizedActiveIndex + 1, slides.length), 'next');
  }

  return [...visibleByIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, placement]) => ({
      slide: slides[index],
      index,
      placement
    }));
}
