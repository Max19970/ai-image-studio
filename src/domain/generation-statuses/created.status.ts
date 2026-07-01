import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const createdStatus = { status: 'created', persisted: true, active: true, terminal: false, uiTone: 'queued', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
