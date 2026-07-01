import type { GenerationStatusDescriptor } from '../generationStatusTypes';

export const runningStatus = { status: 'running', persisted: true, active: true, terminal: false, uiTone: 'streaming', interruptedStatus: 'failed' } satisfies GenerationStatusDescriptor;
