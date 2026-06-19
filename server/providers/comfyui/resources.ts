import { HttpError, type ProviderResourceEntry, type ProviderResourceKind, type ProviderResourceList, type ProviderSettings } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';

function entryFromValue(value: unknown): ProviderResourceEntry | null {
  if (typeof value === 'string') return { id: value, name: value, nativeName: value };
  if (!value || typeof value !== 'object') return null;
  const source = value as any;
  const id = String(source.name ?? source.id ?? source.filename ?? source.title ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: String(source.title ?? source.name ?? source.filename ?? id),
    nativeName: source.filename ? String(source.filename) : id,
    description: source.description ? String(source.description) : undefined,
    metadata: source
  };
}

function entriesFromModelList(data: unknown): ProviderResourceEntry[] {
  if (Array.isArray(data)) return data.flatMap((item) => entryFromValue(item) ?? []);
  if (data && typeof data === 'object') {
    const root = data as any;
    const list = root.models ?? root.items ?? root.data;
    if (Array.isArray(list)) return list.flatMap((item) => entryFromValue(item) ?? []);
  }
  return [];
}

function getObjectInfoNode(data: unknown, nodeName: string): any | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as any;
  return root[nodeName] ?? root.object_info?.[nodeName] ?? null;
}

function firstChoiceArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) return value[0].filter((item) => typeof item === 'string');
    return value.filter((item) => typeof item === 'string');
  }
  return [];
}

function entriesFromObjectInfoChoices(data: unknown, nodeName: string, inputName: string): ProviderResourceEntry[] {
  const node = getObjectInfoNode(data, nodeName);
  const choices = firstChoiceArray(node?.input?.required?.[inputName] ?? node?.input?.optional?.[inputName]);
  return choices.map((choice) => ({ id: choice, name: choice, nativeName: choice }));
}

async function fetchModelFolder(provider: ProviderSettings, folder: 'checkpoints' | 'loras'): Promise<ProviderResourceEntry[]> {
  const data = await fetchComfyUiJson<unknown>(provider, resolveComfyUiUrl(provider, `/models/${folder}`), {
    method: 'GET',
    timeoutMs: provider.timeoutMs
  });
  return entriesFromModelList(data);
}

async function fetchObjectInfo(provider: ProviderSettings, nodeName: string): Promise<unknown> {
  return fetchComfyUiJson<unknown>(provider, resolveComfyUiUrl(provider, `/object_info/${encodeURIComponent(nodeName)}`), {
    method: 'GET',
    timeoutMs: provider.timeoutMs
  });
}

async function fetchCheckpointEntries(provider: ProviderSettings): Promise<{ items: ProviderResourceEntry[]; warning?: string }> {
  try {
    const items = await fetchModelFolder(provider, 'checkpoints');
    if (items.length) return { items };
  } catch (error) {
    const fallback = await fetchObjectInfo(provider, 'CheckpointLoaderSimple');
    const items = entriesFromObjectInfoChoices(fallback, 'CheckpointLoaderSimple', 'ckpt_name');
    return {
      items,
      warning: error instanceof Error ? `Used object_info fallback after /models/checkpoints failed: ${error.message}` : 'Used object_info fallback for checkpoints.'
    };
  }

  const fallback = await fetchObjectInfo(provider, 'CheckpointLoaderSimple');
  return { items: entriesFromObjectInfoChoices(fallback, 'CheckpointLoaderSimple', 'ckpt_name') };
}

async function fetchLoraEntries(provider: ProviderSettings): Promise<{ items: ProviderResourceEntry[]; warning?: string }> {
  try {
    const items = await fetchModelFolder(provider, 'loras');
    if (items.length) return { items };
  } catch (error) {
    const fallback = await fetchObjectInfo(provider, 'LoraLoader');
    const items = entriesFromObjectInfoChoices(fallback, 'LoraLoader', 'lora_name');
    return {
      items,
      warning: error instanceof Error ? `Used object_info fallback after /models/loras failed: ${error.message}` : 'Used object_info fallback for LoRA files.'
    };
  }

  const fallback = await fetchObjectInfo(provider, 'LoraLoader');
  return { items: entriesFromObjectInfoChoices(fallback, 'LoraLoader', 'lora_name') };
}

async function fetchSamplerOrSchedulerEntries(provider: ProviderSettings, inputName: 'sampler_name' | 'scheduler'): Promise<ProviderResourceEntry[]> {
  const data = await fetchObjectInfo(provider, 'KSampler');
  return entriesFromObjectInfoChoices(data, 'KSampler', inputName);
}

export async function fetchComfyUiResources(provider: ProviderSettings, kind: ProviderResourceKind): Promise<ProviderResourceList> {
  let result: { items: ProviderResourceEntry[]; warning?: string };

  if (kind === 'checkpoints' || kind === 'models') result = await fetchCheckpointEntries(provider);
  else if (kind === 'loras') result = await fetchLoraEntries(provider);
  else if (kind === 'samplers') result = { items: await fetchSamplerOrSchedulerEntries(provider, 'sampler_name') };
  else if (kind === 'schedulers') result = { items: await fetchSamplerOrSchedulerEntries(provider, 'scheduler') };
  else throw new HttpError(`ComfyUI provider does not expose resource kind "${kind}".`, 400);

  return {
    kind,
    providerLabel: 'ComfyUI',
    createdAt: Date.now(),
    items: result.items,
    warning: result.warning
  };
}

export const comfyUiResourceKinds = ['models', 'checkpoints', 'loras', 'samplers', 'schedulers'] as const;
