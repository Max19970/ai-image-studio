import type { ProviderSubmitProxyRequestConfig, ProviderSubmitProxyRequestInput } from '../../entities/provider/types';
import { resolveOpenAiCompatibleProviderMode } from '../../entities/generation-params/openai-compatible/modes';

export function createOpenAiCompatibleSubmitProxyRequest(input: ProviderSubmitProxyRequestInput): ProviderSubmitProxyRequestConfig {
  const providerMode = resolveOpenAiCompatibleProviderMode(input.providerMode, input.mode);

  if (providerMode.submit.kind === 'json') {
    return {
      path: providerMode.submit.path ?? '/api/generate',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: input.provider,
          payload: input.payload,
          providerModeId: providerMode.id,
          transport: providerMode.submit
        }),
        signal: input.signal
      },
      streamed: input.payload.stream === true,
      fallbackFormat: String(input.payload.output_format ?? 'png')
    };
  }

  const form = new FormData();
  form.append('provider', JSON.stringify(input.provider));
  form.append('payload', JSON.stringify(input.payload));
  form.append('providerModeId', providerMode.id);
  form.append('transport', JSON.stringify(providerMode.submit));
  if (input.targetImage) form.append('image_target', input.targetImage, input.targetImage.name);
  (input.referenceImages ?? []).forEach((file) => form.append('image_reference', file, file.name));
  if (input.mask) form.append('mask', input.mask, input.mask.name);

  return {
    path: providerMode.submit.path ?? '/api/edit',
    init: {
      method: 'POST',
      body: form,
      signal: input.signal
    },
    streamed: input.payload.stream === true,
    fallbackFormat: String(input.payload.output_format ?? 'png')
  };
}
