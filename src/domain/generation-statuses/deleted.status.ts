import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const deletedStatus = { status: 'deleted', persisted: false, active: false, terminal: true, uiTone: 'cancelled', interruptedStatus: 'deleted' } satisfies GenerationStatusDescriptor;
