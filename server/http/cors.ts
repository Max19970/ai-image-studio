import cors from 'cors';
import { env } from '../providers/types';

export function allowedCorsOrigins(): Set<string> {
  return new Set(
    env('IMAGE_STUDIO_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
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
