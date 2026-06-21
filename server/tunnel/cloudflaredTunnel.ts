import { spawn, type ChildProcess } from 'node:child_process';

export interface CloudflaredTunnelLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface CloudflaredTunnelHandle {
  readonly child: ChildProcess;
  stop(): void;
}

export interface CloudflaredTunnelOptions {
  readonly targetUrl: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly logger?: CloudflaredTunnelLogger;
  readonly spawnProcess?: typeof spawn;
}

export interface TunnelTemplateValues {
  readonly targetUrl: string;
  readonly host: string;
  readonly port: string;
}

const truthyValues = new Set(['1', 'true', 'yes', 'on']);
const falseyValues = new Set(['0', 'false', 'no', 'off', '']);

export function startOptionalCloudflaredTunnel(options: CloudflaredTunnelOptions): CloudflaredTunnelHandle | null {
  const env = options.env ?? process.env;
  if (!isTunnelAutostartEnabled(env)) return null;

  const logger = options.logger ?? console;
  const command = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_COMMAND, env.IMAGE_STUDIO_CLOUDFLARED_COMMAND) ?? 'cloudflared';
  const values: TunnelTemplateValues = {
    targetUrl: options.targetUrl,
    host: env.HOST?.trim() || '127.0.0.1',
    port: env.PORT?.trim() || '8787'
  };
  const args = resolveTunnelArgs(env, values);
  const spawnFn = options.spawnProcess ?? spawn;

  logger.log(`Starting Cloudflare Tunnel for ${options.targetUrl}…`);
  const child = spawnFn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: createCloudflaredChildEnv(env)
  });

  child.stdout?.on('data', (chunk) => logLines(logger, 'log', 'cloudflared', chunk));
  child.stderr?.on('data', (chunk) => logLines(logger, 'warn', 'cloudflared', chunk));
  child.on('error', (error) => logger.error(`Cloudflare Tunnel failed to start: ${error.message}`));
  child.on('exit', (code, signal) => {
    if (code === 0 || signal) logger.log(`Cloudflare Tunnel stopped${signal ? ` by ${signal}` : ''}.`);
    else logger.warn(`Cloudflare Tunnel exited with code ${code}.`);
  });

  const handle: CloudflaredTunnelHandle = {
    child,
    stop: () => stopCloudflaredChild(child, logger)
  };

  bindProcessShutdown(handle);
  return handle;
}

export function isTunnelAutostartEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_AUTOSTART, env.IMAGE_STUDIO_CLOUDFLARED_AUTOSTART);
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return false;
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

function stopCloudflaredChild(child: ChildProcess, logger: CloudflaredTunnelLogger): void {
  if (child.killed || child.exitCode !== null) return;
  logger.log('Stopping Cloudflare Tunnel…');
  child.kill();
}

function bindProcessShutdown(handle: CloudflaredTunnelHandle): void {
  const stop = () => handle.stop();
  process.once('exit', stop);
  process.once('SIGINT', () => {
    stop();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    stop();
    process.exit(143);
  });
}

function logLines(
  logger: CloudflaredTunnelLogger,
  level: keyof Pick<CloudflaredTunnelLogger, 'log' | 'warn'>,
  prefix: string,
  chunk: unknown
): void {
  String(chunk)
    .split(/\r?\n/g)
    .map((line) => redactCloudflaredLogLine(line.trimEnd()))
    .filter(Boolean)
    .forEach((line) => logger[level](`[${prefix}] ${line}`));
}

function createCloudflaredChildEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const childEnv = { ...env };
  delete childEnv.IMAGE_STUDIO_TUNNEL_ARGS;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_ARGS;
  delete childEnv.IMAGE_STUDIO_TUNNEL_COMMAND;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_COMMAND;
  delete childEnv.IMAGE_STUDIO_TUNNEL_AUTOSTART;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_AUTOSTART;
  return childEnv;
}

export function redactCloudflaredLogLine(line: string): string {
  return line
    .replace(/(--token\s+)[^\s\]]+/gi, '$1*****')
    .replace(/(token:)[^\s\]]+/gi, '$1*****')
    .replace(/(TUNNEL_TOKEN:)[^\s\]]+/gi, '$1*****')
    .replace(/(IMAGE_STUDIO_TUNNEL_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****')
    .replace(/(IMAGE_STUDIO_CLOUDFLARED_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****');
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '');
}
