import { env } from '../config/env';

export function splitOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));
}

export function originsFromHosts(value: string): string[] {
  return value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
    .flatMap((host) => {
      const normalized = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!normalized) return [];
      return [`https://${normalized}`, `http://${normalized}`];
    })
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
}

export function defaultLocalOrigins(): string[] {
  const port = env('PORT', '8787');
  const host = env('HOST', '127.0.0.1');
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`
  ];

  if (host && host !== '0.0.0.0' && host !== '::' && !['localhost', '127.0.0.1'].includes(host)) {
    origins.push(`http://${host}:${port}`);
  }

  return [...new Set(origins.map((origin) => normalizeOrigin(origin)).filter((origin): origin is string => Boolean(origin)))];
}

function normalizeOrigin(rawOrigin: string): string | null {
  if (!rawOrigin) return null;
  try {
    const url = new URL(rawOrigin);
    return url.origin;
  } catch {
    return null;
  }
}
