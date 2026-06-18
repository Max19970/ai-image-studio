import type { ProbeStatus } from '../types';

export function classifyProbeResult(status: number | null, message: string): ProbeStatus {
  if (status === null) return 'error';
  if (status >= 200 && status < 300) return 'accepted';

  const lower = message.toLowerCase();
  if ([400, 404, 405, 415, 422].includes(status)) {
    if (/(unknown|unsupported|not supported|invalid|unrecognized|extra)/.test(lower)) return 'rejected';
    return 'rejected';
  }

  return 'error';
}
