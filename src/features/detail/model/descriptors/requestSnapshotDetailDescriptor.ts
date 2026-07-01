import { defaultMetadataRows, fallbackParamRows } from '../detailDescriptorUtils';
import type { ProviderDetailDescriptor } from '../detailDescriptorTypes';

export const requestSnapshotDetailDescriptor: ProviderDetailDescriptor = {
  id: 'openai-compatible.request-snapshot',
  kind: 'request-snapshot',
  order: 1000,
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

export const providerDetailDescriptor = requestSnapshotDetailDescriptor;
