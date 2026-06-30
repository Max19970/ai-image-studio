import type { ProviderFetchContext, ProviderSettings } from '../types';
import { timeoutSignal } from './upstreamClient';

export function resolveOpenAiCompatibleRequestSignal(provider: ProviderSettings, context: ProviderFetchContext): AbortSignal {
  const timeout = timeoutSignal(provider.timeoutMs);
  if (!context.signal) return timeout;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([context.signal, timeout]) : context.signal;
}
