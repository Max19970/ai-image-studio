import type { GenerationStatus } from './types';

export interface GenerationStatusDescriptor {
  status: GenerationStatus;
  persisted: boolean;
  active: boolean;
  terminal: boolean;
  uiTone: 'queued' | 'streaming' | 'succeeded' | 'failed' | 'cancelled';
  interruptedStatus: GenerationStatus;
}
