import { HttpError } from '../../http/httpError';
import type { ProviderModeSubmitInput } from '../types';

const openAiGenerateModeIds = new Set([
  'openai-compatible.image-generate',
  'openai-compatible.legacy-generate'
]);

const openAiEditModeIds = new Set([
  'openai-compatible.image-edit',
  'openai-compatible.legacy-edit'
]);

export function resolveOpenAiCompatibleSubmitOperation(input: ProviderModeSubmitInput): 'generate' | 'edit' {
  const providerModeId = String(input.providerModeId ?? '');
  if (openAiGenerateModeIds.has(providerModeId)) return 'generate';
  if (openAiEditModeIds.has(providerModeId)) return 'edit';

  if (input.transport?.operation === 'generate') return 'generate';
  if (input.transport?.operation === 'edit') return 'edit';
  if (input.transport?.kind === 'json') return 'generate';
  if (input.transport?.kind === 'multipart') return 'edit';

  throw new HttpError(`Unsupported OpenAI-compatible provider mode: ${providerModeId || 'missing providerModeId'}.`, 400);
}
