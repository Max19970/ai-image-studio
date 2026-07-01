import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const retryingStatus = { status: 'retrying', persisted: true, active: true, terminal: false, uiTone: 'streaming', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
