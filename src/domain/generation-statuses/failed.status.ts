import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const failedStatus = { status: 'failed', persisted: true, active: false, terminal: true, uiTone: 'failed', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
