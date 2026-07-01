import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const queuedStatus = { status: 'queued', persisted: true, active: true, terminal: false, uiTone: 'queued', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
