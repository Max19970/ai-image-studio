import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const sendingStatus = { status: 'sending', persisted: true, active: true, terminal: false, uiTone: 'streaming', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
