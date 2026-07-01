import { HttpError } from '../../http/httpError';
import type { ProbeEntry, ProbeReport, ProviderQuickCheckResult, ProviderSettings } from '../types';
import { getProviderApiKey, buildOpenAiCompatibleHeaders } from './auth';
import { providerFingerprint, resolveOpenAiCompatibleEndpoint } from './endpoints';
import { extractUpstreamMessage } from './errorNormalizer';
import { makePng } from './fixtureImage';
import { appendProbeImage, formValue } from './multipartEdit';
import { classifyProbeResult } from './probeClassifier';
import { fetchUpstream, timeoutSignal } from './upstreamClient';

async function readProbeResponse(response: Response, isStream: boolean): Promise<{ status: number; text: string }> {
  if (isStream) {
    const reader = response.body?.getReader();
    let chunks = '';
    if (reader) {
      const decoder = new TextDecoder();
      while (chunks.length < 3000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks += decoder.decode(value, { stream: true });
        if (chunks.includes('[DONE]')) break;
      }
    }
    return { status: response.status, text: chunks };
  }
  return { status: response.status, text: await response.text() };
}

async function probeJsonCase(provider: ProviderSettings, body: Record<string, unknown>, isStream = false): Promise<ProbeEntry> {
  try {
    const response = await fetchUpstream(resolveOpenAiCompatibleEndpoint(provider, 'generate'), {
      method: 'POST',
      headers: buildOpenAiCompatibleHeaders(provider),
      body: JSON.stringify(body),
      signal: timeoutSignal(Math.min(provider.timeoutMs, 180_000))
    });

    const { status, text } = await readProbeResponse(response, isStream);
    const message = status >= 200 && status < 300 ? 'OK' : extractUpstreamMessage(text);
    const verdict = classifyProbeResult(status, message);
    return { supported: verdict === 'accepted', status: verdict, message, testedValue: body };
  } catch (error) {
    return { supported: false, status: 'error', message: error instanceof Error ? error.message : String(error), testedValue: body };
  }
}

async function probeEditCase(provider: ProviderSettings, payload: Record<string, unknown>, includeMask = false, isStream = false): Promise<ProbeEntry> {
  try {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, formValue(value));
    });

    const target = makePng(1024, 1024, [255, 255, 255, 255]);
    appendProbeImage(form, target, 'probe-target.png');
    if (includeMask) {
      const mask = makePng(1024, 1024, [0, 0, 0, 0]);
      appendProbeImage(form, mask, 'probe-mask.png', 'image/png', 'mask');
    }

    const response = await fetchUpstream(resolveOpenAiCompatibleEndpoint(provider, 'edit'), {
      method: 'POST',
      headers: buildOpenAiCompatibleHeaders(provider, true),
      body: form,
      signal: timeoutSignal(Math.min(provider.timeoutMs, 180_000))
    });

    const { status, text } = await readProbeResponse(response, isStream);
    const message = status >= 200 && status < 300 ? 'OK' : extractUpstreamMessage(text);
    const verdict = classifyProbeResult(status, message);
    return { supported: verdict === 'accepted', status: verdict, message, testedValue: payload };
  } catch (error) {
    return { supported: false, status: 'error', message: error instanceof Error ? error.message : String(error), testedValue: payload };
  }
}

export async function quickCheckOpenAiCompatibleProvider(provider: ProviderSettings): Promise<ProviderQuickCheckResult> {
  try {
    const model = provider.modelId?.trim() || 'gpt-image-2';
    getProviderApiKey(provider);

    const payload = {
      model,
      prompt: 'Quick provider connectivity test. Generate a tiny simple image.',
      n: 1,
      size: '1024x1024'
    };

    const endpoint = resolveOpenAiCompatibleEndpoint(provider, 'generate');
    const upstream = await fetchUpstream(endpoint, {
      method: 'POST',
      headers: buildOpenAiCompatibleHeaders(provider),
      body: JSON.stringify(payload),
      signal: timeoutSignal(Math.min(provider.timeoutMs, 60_000))
    }, 1);

    const text = await upstream.text();
    return {
      ok: upstream.ok,
      status: upstream.status,
      message: upstream.ok ? 'OK' : extractUpstreamMessage(text),
      createdAt: Date.now()
    };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof HttpError ? error.statusCode : null,
      message: error instanceof Error ? error.message : String(error),
      createdAt: Date.now()
    };
  }
}

export async function probeOpenAiCompatibleProvider(provider: ProviderSettings): Promise<ProbeReport> {
  const model = provider.modelId?.trim() || 'gpt-image-2';

  // Validate key early so the user gets one clean error, not a wall of repeated failures.
  getProviderApiKey(provider);

  const baseGenerate = {
    model,
    prompt: 'Create a tiny red square centered on a white background.',
    n: 1,
    size: '1024x1024',
    quality: 'low'
  };

  const baseEdit = {
    model,
    prompt: 'Add a tiny blue dot in the center. Keep everything else unchanged.',
    n: 1,
    size: '1024x1024',
    quality: 'low'
  };

  const report: ProbeReport = {
    fingerprint: providerFingerprint(provider),
    createdAt: Date.now(),
    providerLabel: `${model} @ ${resolveOpenAiCompatibleEndpoint(provider, 'generate')}`,
    baseline: {
      generation: await probeJsonCase(provider, baseGenerate),
      edit: await probeEditCase(provider, baseEdit)
    },
    generation: {},
    edit: {}
  };

  report.baseline.unknownParamControlGeneration = await probeJsonCase(provider, { ...baseGenerate, __probe_unknown_param__: 'x' });
  report.baseline.unknownParamControlEdit = await probeEditCase(provider, { ...baseEdit, __probe_unknown_param__: 'x' });

  if (report.baseline.unknownParamControlGeneration.supported || report.baseline.unknownParamControlEdit?.supported) {
    report.caveat = 'Unknown parameter control was accepted at least once. This provider may silently ignore unsupported fields, so accepted does not always mean effective.';
  }

  const generationTests: Record<string, Record<string, unknown>> = {
    model: { ...baseGenerate, model },
    n: { ...baseGenerate, n: 1 },
    size: { ...baseGenerate, size: '1024x1024' },
    quality: { ...baseGenerate, quality: 'low' },
    background: { ...baseGenerate, background: 'opaque' },
    moderation: { ...baseGenerate, moderation: 'low' },
    output_format: { ...baseGenerate, output_format: 'jpeg' },
    output_compression: { ...baseGenerate, output_format: 'jpeg', output_compression: 80 },
    stream: { ...baseGenerate, stream: true },
    partial_images: { ...baseGenerate, stream: true, partial_images: 1 },
    response_format: { ...baseGenerate, response_format: 'b64_json' },
    user: { ...baseGenerate, user: 'provider-probe-user' },
    style: { ...baseGenerate, style: 'natural' }
  };

  const editTests: Record<string, { payload: Record<string, unknown>; includeMask?: boolean; isStream?: boolean }> = {
    model: { payload: { ...baseEdit, model } },
    n: { payload: { ...baseEdit, n: 1 } },
    size: { payload: { ...baseEdit, size: '1024x1024' } },
    quality: { payload: { ...baseEdit, quality: 'low' } },
    background: { payload: { ...baseEdit, background: 'opaque' } },
    moderation: { payload: { ...baseEdit, moderation: 'low' } },
    output_format: { payload: { ...baseEdit, output_format: 'jpeg' } },
    output_compression: { payload: { ...baseEdit, output_format: 'jpeg', output_compression: 80 } },
    stream: { payload: { ...baseEdit, stream: true }, isStream: true },
    partial_images: { payload: { ...baseEdit, stream: true, partial_images: 1 }, isStream: true },
    response_format: { payload: { ...baseEdit, response_format: 'b64_json' } },
    input_fidelity: { payload: { ...baseEdit, input_fidelity: 'low' } },
    user: { payload: { ...baseEdit, user: 'provider-probe-user' } },
    style: { payload: { ...baseEdit, style: 'natural' } }
  };

  for (const [key, payload] of Object.entries(generationTests)) {
    report.generation[key] = await probeJsonCase(provider, payload, key === 'stream' || key === 'partial_images');
  }

  for (const [key, test] of Object.entries(editTests)) {
    report.edit[key] = await probeEditCase(provider, test.payload, Boolean(test.includeMask), Boolean(test.isStream));
  }

  return report;
}
