import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const cancelledStatus = { status: 'cancelled', persisted: true, active: false, terminal: true, uiTone: 'cancelled', interruptedStatus: 'cancelled' } satisfies GenerationStatusDescriptor;
