import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { DetailTopbarSection } from './DetailTopbarSection';

export default {
  id: 'detail.sections.topbar',
  label: 'Detail topbar section',
  Component: DetailTopbarSection
} satisfies ElementDefinition<DetailLayoutContext>;
