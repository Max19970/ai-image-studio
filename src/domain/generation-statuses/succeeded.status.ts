import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const succeededStatus = { status: 'succeeded', persisted: true, active: false, terminal: true, uiTone: 'succeeded', interruptedStatus: 'succeeded' } satisfies GenerationStatusDescriptor;
