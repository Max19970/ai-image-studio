import type express from 'express';
import { env } from '../config/env';

export function registerDefaultRoutes(app: express.Express) {
  app.get('/api/defaults', (_req, res) => {
    res.json({
      generationEndpoint: env('DEFAULT_GENERATION_ENDPOINT', 'https://api.openai.com/v1/images/generations'),
      editEndpoint: env('DEFAULT_EDIT_ENDPOINT', 'https://api.openai.com/v1/images/edits'),
      responsesEndpoint: env('DEFAULT_RESPONSES_ENDPOINT', 'https://api.openai.com/v1/responses'),
      modelId: env('DEFAULT_MODEL_ID', 'gpt-image-2'),
      hasEnvApiKey: Boolean(env('OPENAI_API_KEY'))
    });
  });
}
