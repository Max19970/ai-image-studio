import type { TunnelTemplateValues } from './cloudflaredTunnelTypes';

const truthyValues = new Set(['1', 'true', 'yes', 'on']);
const falseyValues = new Set(['0', 'false', 'no', 'off', '']);

export function isTunnelAutostartEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_AUTOSTART, env.IMAGE_STUDIO_CLOUDFLARED_AUTOSTART);
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return false;
}

export function isTunnelCleanupOnStopEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_CLEANUP_ON_STOP, env.IMAGE_STUDIO_CLOUDFLARED_CLEANUP_ON_STOP);
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return true;
}

export function resolveTunnelArgs(env: NodeJS.ProcessEnv, values: TunnelTemplateValues): string[] {
  const explicitArgs = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_ARGS, env.IMAGE_STUDIO_CLOUDFLARED_ARGS);
  if (explicitArgs) return splitCommandArgs(interpolateTunnelArgs(explicitArgs, values));
  return ['tunnel', '--url', values.targetUrl];
}

export function splitCommandArgs(source: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (quote === char) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaped) current += '\\';
  if (current) args.push(current);
  return args;
}

function interpolateTunnelArgs(source: string, values: TunnelTemplateValues): string {
  return source
    .replaceAll('${IMAGE_STUDIO_TUNNEL_TARGET_URL}', values.targetUrl)
    .replaceAll('${targetUrl}', values.targetUrl)
    .replaceAll('${HOST}', values.host)
    .replaceAll('${PORT}', values.port);
}

export function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '');
}
