import type { ElementPlacement } from '../registry/types';
import type { DetailLayoutContext } from '../context/workspace/detail';

export default [
  {
    id: 'detail.layout.topbar',
    slot: 'detail/topbar',
    use: 'detail.sections.topbar',
    order: 10
  },
  {
    id: 'detail.layout.hero',
    slot: 'detail/hero',
    use: 'detail.sections.hero',
    order: 10
  },
  {
    id: 'detail.layout.request-drawer',
    slot: 'detail/request-drawer',
    use: 'detail.sections.requestDrawer',
    order: 10
  }
] satisfies ElementPlacement<DetailLayoutContext>[];
