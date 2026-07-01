export const currentDocumentKey = 'current';

export interface AppDocumentBucketDescriptor<T = unknown> {
  id: string;
  bucket: string;
  documentKey: string;
  fallback: T;
}

export interface AppDocumentRouteDescriptor<T = unknown> extends AppDocumentBucketDescriptor<T> {
  route: string;
  requestKey: string;
  allowDelete?: boolean;
}

export const appDocumentBuckets = {
  studioSettings: {
    id: 'studio-settings',
    bucket: 'studio-settings.v2',
    documentKey: currentDocumentKey,
    fallback: null
  },
  imageParams: {
    id: 'image-params',
    bucket: 'image-params.v2',
    documentKey: currentDocumentKey,
    fallback: null
  },
  requestPresets: {
    id: 'request-presets',
    bucket: 'request-presets.v1',
    documentKey: currentDocumentKey,
    fallback: []
  },
  providerProbeCache: {
    id: 'provider-probe-cache',
    bucket: 'provider-probe-cache.v2',
    documentKey: currentDocumentKey,
    fallback: {}
  },
  integrationSettings: {
    id: 'integration-settings',
    bucket: 'integration-settings.v1',
    documentKey: currentDocumentKey,
    fallback: null
  }
} as const satisfies Record<string, AppDocumentBucketDescriptor>;

export const appDocumentRoutes = [
  {
    ...appDocumentBuckets.studioSettings,
    route: '/api/storage/studio-settings',
    requestKey: 'settings'
  },
  {
    ...appDocumentBuckets.imageParams,
    route: '/api/storage/image-params',
    requestKey: 'params'
  },
  {
    ...appDocumentBuckets.requestPresets,
    route: '/api/storage/request-presets',
    requestKey: 'presets'
  },
  {
    ...appDocumentBuckets.providerProbeCache,
    route: '/api/storage/provider-probe-cache',
    requestKey: 'cache',
    allowDelete: true
  }
] as const satisfies readonly AppDocumentRouteDescriptor[];

export function listAppDocumentRouteDescriptors(): readonly AppDocumentRouteDescriptor[] {
  return appDocumentRoutes;
}
