import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { DetailRequestDrawerSection } from './DetailRequestDrawerSection';

export default {
  id: 'detail.sections.requestDrawer',
  label: 'Detail request drawer section',
  Component: DetailRequestDrawerSection
} satisfies ElementDefinition<DetailLayoutContext>;
