import type express from 'express';
import { sendServerError } from '../../http/errors';
import { getLiveGenerationImageAsset } from '../../processes/liveGenerationImageStore';

export function registerLiveGenerationImageRoutes(app: express.Express) {
  app.get('/api/generation-tasks/live-images/:imageId', (req, res) => {
    try {
      const asset = getLiveGenerationImageAsset(req.params.imageId);
      if (!asset) {
        res.status(404).json({ error: { message: 'Live generation image not found.' } });
        return;
      }
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Cache-Control', 'no-store, no-transform');
      res.setHeader('Content-Length', String(asset.bytes.length));
      res.end(asset.bytes);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
