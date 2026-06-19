import type { GeneratedImage, GenerationRequestSnapshot } from '../../../domain/generationTask';

export interface DetailDataRow {
  id: string;
  label: string;
  value: string | number | boolean | null | undefined;
}

export interface DetailTechnicalBlock {
  id: string;
  title: string;
  value: unknown;
  defaultOpen?: boolean;
}

export interface DetailDescriptorContext {
  snapshot: GenerationRequestSnapshot;
  raw?: unknown;
  activeImage?: GeneratedImage | null;
  t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string;
}

export interface ProviderDetailDescriptor {
  id: string;
  kind: 'request-snapshot' | 'provider-owned';
  parameterTitleKey: string;
  parameterKickerKey: string;
  metadataTitleKey: string;
  metadataKickerKey: string;
  runtimeTitleKey?: string;
  runtimeKickerKey?: string;
  getParameterRows(context: DetailDescriptorContext): DetailDataRow[];
  getMetadataRows(context: DetailDescriptorContext): DetailDataRow[];
  getRuntimeRows?(context: DetailDescriptorContext): DetailDataRow[];
  getTechnicalBlocks(context: DetailDescriptorContext): DetailTechnicalBlock[];
}

const COMFYUI_ADAPTER_ID = 'comfyui';
const COMFYUI_SURFACE_ID = 'comfyui.text-to-image';

function stringifyParam(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readNestedRecord(value: unknown, key: string): Record<string, unknown> | null {
  const root = asRecord(value);
  return root ? asRecord(root[key]) : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function fallbackParamRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
  const labelMap: Record<string, string> = {
    model: t('detail.param.model'),
    n: t('detail.param.n'),
    size: t('detail.param.size'),
    quality: t('detail.param.quality'),
    background: t('detail.param.background'),
    moderation: t('detail.param.moderation'),
    output_format: t('detail.param.format'),
    output_compression: t('detail.param.compression'),
    stream: t('detail.param.stream'),
    partial_images: t('detail.param.partialImages'),
    response_format: t('detail.param.responseFormat'),
    input_fidelity: t('detail.param.inputFidelity'),
    user: t('detail.param.user'),
    style: t('detail.param.style')
  };

  return Object.entries(snapshot.payload)
    .filter(([key]) => key !== 'prompt')
    .map(([key, value]) => ({ id: key, label: labelMap[key] ?? key, value: stringifyParam(value) }));
}

function summaryRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
  return snapshot.parameterSummary?.entries?.map((entry) => ({
    id: entry.id,
    label: t(`detail.comfy.param.${entry.id}`) === `detail.comfy.param.${entry.id}` ? entry.label : t(`detail.comfy.param.${entry.id}`),
    value: entry.value
  })) ?? [];
}

function defaultMetadataRows(snapshot: GenerationRequestSnapshot, t: DetailDescriptorContext['t']): DetailDataRow[] {
  return [
    { id: 'mode', label: t('detail.mode'), value: t(`gallery.mode.${snapshot.mode}`) },
    { id: 'model', label: t('detail.model'), value: snapshot.modelLabel || snapshot.model || t('detail.notSet') },
    { id: 'provider', label: t('detail.provider'), value: snapshot.providerLabel || t('detail.notSet') },
    { id: 'endpoint', label: t('detail.endpoint'), value: snapshot.endpoint || t('detail.notSet') },
    { id: 'created', label: t('detail.created'), value: new Date(snapshot.createdAt).toLocaleString() }
  ];
}

function readComfyRaw(raw?: unknown): Record<string, unknown> | null {
  return readNestedRecord(raw, 'comfyui');
}

function countWorkflowNodes(workflow: unknown): number | null {
  const prompt = readNestedRecord(workflow, 'prompt');
  if (prompt) return Object.keys(prompt).length;
  const root = asRecord(workflow);
  return root ? Object.keys(root).length : null;
}

function comfyRuntimeRows({ snapshot, raw, t }: DetailDescriptorContext): DetailDataRow[] {
  const comfy = readComfyRaw(raw);
  const images = readArray(comfy?.images);
  const workflowNodes = countWorkflowNodes(comfy?.workflow);
  const rows: DetailDataRow[] = [];

  if (comfy?.prompt_id) rows.push({ id: 'promptId', label: t('detail.comfy.promptId'), value: String(comfy.prompt_id) });
  rows.push({ id: 'checkpoint', label: t('detail.comfy.checkpoint'), value: String(comfy?.checkpoint ?? snapshot.modelLabel ?? snapshot.model ?? t('detail.notSet')) });
  if (comfy?.seed !== undefined) rows.push({ id: 'seed', label: t('detail.comfy.seed'), value: String(comfy.seed) });
  if (images.length > 0) rows.push({ id: 'outputRefs', label: t('detail.comfy.outputRefs'), value: images.length });
  if (workflowNodes !== null) rows.push({ id: 'workflowNodes', label: t('detail.comfy.workflowNodes'), value: workflowNodes });

  return rows;
}

function comfyTechnicalBlocks({ snapshot, raw, activeImage, t }: DetailDescriptorContext): DetailTechnicalBlock[] {
  const comfy = readComfyRaw(raw);
  const blocks: DetailTechnicalBlock[] = [
    { id: 'payload', title: t('detail.payloadJson'), value: snapshot.payload },
    { id: 'workflow', title: t('detail.comfy.workflowJson'), value: comfy?.workflow },
    { id: 'history', title: t('detail.comfy.historyJson'), value: comfy?.history },
    { id: 'response', title: t('detail.responsePayload'), value: raw },
    { id: 'imageRaw', title: t('detail.imageRaw'), value: activeImage?.raw }
  ];
  return blocks.filter((block) => block.value !== undefined && block.value !== null);
}

const requestSnapshotDetailDescriptor: ProviderDetailDescriptor = {
  id: 'openai-compatible.request-snapshot',
  kind: 'request-snapshot',
  parameterTitleKey: 'detail.sentParams',
  parameterKickerKey: 'detail.parameters',
  metadataTitleKey: 'detail.meta',
  metadataKickerKey: 'detail.request',
  getParameterRows: ({ snapshot, t }) => fallbackParamRows(snapshot, t),
  getMetadataRows: ({ snapshot, t }) => defaultMetadataRows(snapshot, t),
  getTechnicalBlocks: ({ snapshot, raw, activeImage, t }) => ([
    { id: 'payload', title: t('detail.payloadJson'), value: snapshot.payload },
    { id: 'response', title: t('detail.responsePayload'), value: raw },
    { id: 'imageRaw', title: t('detail.imageRaw'), value: activeImage?.raw }
  ].filter((block) => block.value !== undefined && block.value !== null))
};

const comfyUiDetailDescriptor: ProviderDetailDescriptor = {
  id: 'comfyui.workflow-summary',
  kind: 'provider-owned',
  parameterTitleKey: 'detail.comfy.workflowParameters',
  parameterKickerKey: 'detail.comfy.localWorkflow',
  metadataTitleKey: 'detail.comfy.requestMeta',
  metadataKickerKey: 'detail.request',
  runtimeTitleKey: 'detail.comfy.runtime',
  runtimeKickerKey: 'detail.comfy.localExecution',
  getParameterRows: ({ snapshot, t }) => summaryRows(snapshot, t).length ? summaryRows(snapshot, t) : fallbackParamRows(snapshot, t),
  getMetadataRows: ({ snapshot, t }) => [
    { id: 'mode', label: t('detail.mode'), value: t(`gallery.mode.${snapshot.mode}`) },
    { id: 'provider', label: t('detail.provider'), value: snapshot.providerLabel || t('detail.notSet') },
    { id: 'checkpoint', label: t('detail.comfy.checkpoint'), value: snapshot.modelLabel || snapshot.model || t('detail.notSet') },
    { id: 'server', label: t('detail.comfy.server'), value: snapshot.endpoint || t('detail.notSet') },
    { id: 'created', label: t('detail.created'), value: new Date(snapshot.createdAt).toLocaleString() }
  ],
  getRuntimeRows: comfyRuntimeRows,
  getTechnicalBlocks: comfyTechnicalBlocks
};

export function getProviderDetailDescriptor(snapshot: GenerationRequestSnapshot): ProviderDetailDescriptor {
  if (snapshot.providerAdapterId === COMFYUI_ADAPTER_ID || snapshot.surfaceId === COMFYUI_SURFACE_ID) return comfyUiDetailDescriptor;
  return requestSnapshotDetailDescriptor;
}

export function createDetailDescriptorContext(args: {
  snapshot: GenerationRequestSnapshot;
  raw?: unknown;
  activeImage?: GeneratedImage | null;
  t: DetailDescriptorContext['t'];
}): DetailDescriptorContext {
  return args;
}
