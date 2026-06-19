import type express from 'express';
import { sendServerError } from '../http/errors';
import { getProviderAdapter, parseProviderSettings } from '../providers/registry';
import { HttpError, ProviderResourceRequestSchema, type ProviderResourceKind } from '../providers/types';

export function registerProviderRoutes(app: express.Express) {
  app.post('/api/provider/quick-check', async (req, res) => {
    const provider = parseProviderSettings(req.body.provider ?? {});
    res.json(await getProviderAdapter(provider.adapterId).quickCheck(provider));
  });

  app.post('/api/provider/probe', async (req, res) => {
    try {
      const provider = parseProviderSettings(req.body.provider ?? {});
      res.json(await getProviderAdapter(provider.adapterId).probe(provider));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/provider/resources', async (req, res) => {
    try {
      const request = ProviderResourceRequestSchema.parse(req.body ?? {});
      const provider = parseProviderSettings(request.provider);
      const kind = request.kind;
      const adapter = getProviderAdapter(provider.adapterId);
      if (!adapter.fetchResources) {
        throw new HttpError(`Provider adapter "${adapter.id}" does not expose live resources.`, 400);
      }
      if (adapter.resources.kinds.length > 0 && !adapter.resources.kinds.includes(kind as ProviderResourceKind)) {
        throw new HttpError(`Provider adapter "${adapter.id}" does not expose resource kind "${kind}".`, 400);
      }
      res.json(await adapter.fetchResources(provider, kind as ProviderResourceKind));
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
