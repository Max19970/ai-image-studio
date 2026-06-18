import type express from 'express';
import { getProviderAdapter } from '../providers/registry';
import { ProviderSchema } from '../providers/types';
import { sendServerError } from '../http/errors';

export function registerProviderRoutes(app: express.Express) {
  app.post('/api/provider/quick-check', async (req, res) => {
    const provider = ProviderSchema.parse(req.body.provider ?? {});
    res.json(await getProviderAdapter(provider.adapterId).quickCheck(provider));
  });

  app.post('/api/provider/probe', async (req, res) => {
    try {
      const provider = ProviderSchema.parse(req.body.provider ?? {});
      res.json(await getProviderAdapter(provider.adapterId).probe(provider));
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
