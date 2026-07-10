import { z } from 'zod';
import { HttpError } from '../http/httpError';

export const ProviderResourceRequestSchema = z.object({
  provider: z.unknown(),
  kind: z.string().min(1)
});

export function normalizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object.');
  }
  return payload as Record<string, unknown>;
}

export function validatePromptPayload(payload: Record<string, unknown>) {
  if (typeof payload.prompt !== 'string' || payload.prompt.trim().length === 0) {
    throw new HttpError('Prompt is required before sending the image request.', 400);
  }
}
