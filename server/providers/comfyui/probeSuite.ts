import { compactCause } from '../../http/errorCause';
import type { ProbeEntry, ProbeReport, ProviderQuickCheckResult, ProviderSettings } from '../types';
import { comfyUiProviderFingerprint, resolveComfyUiBaseUrl, resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';
import { fetchComfyUiResources } from './resources';

function accepted(message?: string): ProbeEntry {
  return { supported: true, status: 'accepted', message };
}

function rejected(message: string): ProbeEntry {
  return { supported: false, status: 'rejected', message };
}

function errorEntry(error: unknown): ProbeEntry {
  return {
    supported: false,
    status: 'error',
    message: error instanceof Error ? error.message : String(error)
  };
}

export async function quickCheckComfyUiProvider(provider: ProviderSettings): Promise<ProviderQuickCheckResult> {
  const createdAt = Date.now();
  try {
    await fetchComfyUiJson<unknown>(provider, resolveComfyUiUrl(provider, '/system_stats'), {
      method: 'GET',
      timeoutMs: Math.min(provider.timeoutMs, 10_000)
    });
    return { ok: true, status: 200, message: `ComfyUI is reachable at ${resolveComfyUiBaseUrl(provider)}.`, createdAt };
  } catch (systemStatsError) {
    try {
      await fetchComfyUiJson<unknown>(provider, resolveComfyUiUrl(provider, '/object_info/KSampler'), {
        method: 'GET',
        timeoutMs: Math.min(provider.timeoutMs, 10_000)
      });
      return { ok: true, status: 200, message: `ComfyUI object_info is reachable at ${resolveComfyUiBaseUrl(provider)}.`, createdAt };
    } catch (objectInfoError) {
      return {
        ok: false,
        status: null,
        message: `Cannot reach ComfyUI at ${resolveComfyUiBaseUrl(provider)}. ${compactCause(objectInfoError) || (objectInfoError instanceof Error ? objectInfoError.message : String(objectInfoError)) || (systemStatsError instanceof Error ? systemStatsError.message : String(systemStatsError))}`,
        createdAt
      };
    }
  }
}

export async function probeComfyUiProvider(provider: ProviderSettings): Promise<ProbeReport> {
  const createdAt = Date.now();
  const report: ProbeReport = {
    fingerprint: comfyUiProviderFingerprint(provider),
    createdAt,
    providerLabel: 'ComfyUI',
    caveat: 'ComfyUI probe is non-destructive: it checks connectivity and live resources, but does not run a generation.',
    baseline: {
      generation: accepted('ComfyUI text-to-image generation is supported by the Image Studio ComfyUI adapter.'),
      edit: rejected('Image edits/inpainting are intentionally disabled in the ComfyUI MVP adapter.'),
      unknownParamControlGeneration: accepted('Provider-owned ComfyUI payload ignores OpenAI-compatible unknown-param probing.'),
      unknownParamControlEdit: rejected('ComfyUI edit mode is disabled in the MVP adapter.')
    },
    generation: {},
    edit: {}
  };

  try {
    const [checkpoints, samplers, schedulers] = await Promise.all([
      fetchComfyUiResources(provider, 'checkpoints'),
      fetchComfyUiResources(provider, 'samplers'),
      fetchComfyUiResources(provider, 'schedulers')
    ]);
    report.generation.model = checkpoints.items.length ? accepted(`${checkpoints.items.length} checkpoint(s) available.`) : rejected('No ComfyUI checkpoints were found.');
    report.generation.sampler_name = samplers.items.length ? accepted(`${samplers.items.length} sampler(s) available.`) : rejected('No KSampler sampler names were found.');
    report.generation.scheduler = schedulers.items.length ? accepted(`${schedulers.items.length} scheduler(s) available.`) : rejected('No KSampler schedulers were found.');
    report.generation.prompt = accepted('Prompt is injected into CLIPTextEncode nodes.');
    report.generation.size = accepted('Width/height are injected into EmptyLatentImage.');
    report.generation.seed = accepted('Seed is injected into KSampler.');
    report.generation.loras = accepted('LoRA stack is supported through LoraLoader nodes when registered by the client.');
  } catch (error) {
    report.generation.connection = errorEntry(error);
  }

  report.edit.mode = rejected('ComfyUI image edit mode is not enabled yet.');
  return report;
}
