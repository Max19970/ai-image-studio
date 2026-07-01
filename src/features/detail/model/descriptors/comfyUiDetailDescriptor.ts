import {
  asRecord,
  fallbackParamRows,
  readArray,
  readNestedRecord,
  requestModeLabel,
  summaryRows
} from '../detailDescriptorUtils';
import type { DetailDataRow, DetailDescriptorContext, DetailTechnicalBlock, ProviderDetailDescriptor } from '../detailDescriptorTypes';

const adapterId = 'comfyui';
const surfaceId = 'comfyui.text-to-image';

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

export const comfyUiDetailDescriptor: ProviderDetailDescriptor = {
  id: 'comfyui.workflow-summary',
  kind: 'provider-owned',
  order: 100,
  parameterTitleKey: 'detail.comfy.workflowParameters',
  parameterKickerKey: 'detail.comfy.localWorkflow',
  metadataTitleKey: 'detail.comfy.requestMeta',
  metadataKickerKey: 'detail.request',
  runtimeTitleKey: 'detail.comfy.runtime',
  runtimeKickerKey: 'detail.comfy.localExecution',
  matches: (snapshot) => snapshot.providerAdapterId === adapterId || snapshot.surfaceId === surfaceId,
  getParameterRows: ({ snapshot, t }) => summaryRows(snapshot, t).length ? summaryRows(snapshot, t) : fallbackParamRows(snapshot, t),
  getMetadataRows: ({ snapshot, t }) => [
    { id: 'mode', label: t('detail.mode'), value: requestModeLabel(snapshot, t) },
    { id: 'provider', label: t('detail.provider'), value: snapshot.providerLabel || t('detail.notSet') },
    { id: 'checkpoint', label: t('detail.comfy.checkpoint'), value: snapshot.modelLabel || snapshot.model || t('detail.notSet') },
    { id: 'server', label: t('detail.comfy.server'), value: snapshot.endpoint || t('detail.notSet') },
    { id: 'created', label: t('detail.created'), value: new Date(snapshot.createdAt).toLocaleString() }
  ],
  getRuntimeRows: comfyRuntimeRows,
  getTechnicalBlocks: comfyTechnicalBlocks
};

export const providerDetailDescriptor = comfyUiDetailDescriptor;
