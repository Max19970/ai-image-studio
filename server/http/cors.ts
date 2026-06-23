import cors from 'cors';
import { env } from '../providers/types';
import { defaultLocalOrigins, originsFromHosts, splitOrigins } from './corsOrigins';

export function allowedCorsOrigins(): Set<string> {
  return new Set([
    ...splitOrigins(env('IMAGE_STUDIO_ALLOWED_ORIGINS')),
    ...splitOrigins(env('IMAGE_STUDIO_PUBLIC_URL')),
    ...originsFromHosts(env('IMAGE_STUDIO_ALLOWED_HOSTS')),
    ...defaultLocalOrigins()
  ]);
}

export function createCorsMiddleware() {
  return cors({
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins().has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed by Image Studio: ${origin}`));
    }
  });
}
