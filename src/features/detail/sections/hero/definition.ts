import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { DetailHeroSection } from './DetailHeroSection';

export default {
  id: 'detail.sections.hero',
  label: 'Detail hero section',
  Component: DetailHeroSection
} satisfies ElementDefinition<DetailLayoutContext>;
