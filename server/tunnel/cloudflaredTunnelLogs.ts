import type {
  CloudflaredRuntimeIds,
  CloudflaredTunnelLogger,
  CloudflaredTunnelRuntimeState
} from './cloudflaredTunnelTypes';

export function readCloudflaredRuntimeIds(line: string): CloudflaredRuntimeIds {
  return {
    tunnelId: readCloudflaredTunnelId(line),
    connectorId: readCloudflaredConnectorId(line)
  };
}

export function handleCloudflaredOutput(
  state: CloudflaredTunnelRuntimeState,
  logger: CloudflaredTunnelLogger,
  level: keyof Pick<CloudflaredTunnelLogger, 'log' | 'warn'>,
  prefix: string,
  chunk: unknown
): void {
  String(chunk)
    .split(/\r?\n/g)
    .forEach((rawLine) => {
      updateCloudflaredRuntimeIds(state, rawLine);
      const line = redactCloudflaredLogLine(rawLine.trimEnd());
      if (line) logger[level](`[${prefix}] ${line}`);
    });
}

export function logCleanupOutput(
  logger: CloudflaredTunnelLogger,
  level: keyof Pick<CloudflaredTunnelLogger, 'log' | 'warn'>,
  output: string | Buffer | null | undefined
): void {
  if (!output) return;
  String(output)
    .split(/\r?\n/g)
    .map((line) => redactCloudflaredLogLine(line.trimEnd()))
    .filter(Boolean)
    .forEach((line) => logger[level](`[cloudflared cleanup] ${line}`));
}

function updateCloudflaredRuntimeIds(state: CloudflaredTunnelRuntimeState, line: string): void {
  const ids = readCloudflaredRuntimeIds(line);
  if (ids.tunnelId) state.tunnelId = ids.tunnelId;
  if (ids.connectorId) state.connectorId = ids.connectorId;
}

function readCloudflaredTunnelId(line: string): string | undefined {
  return line.match(/\btunnelID=([a-z0-9-]+)/i)?.[1];
}

function readCloudflaredConnectorId(line: string): string | undefined {
  return line.match(/\bGenerated Connector ID:\s*([a-z0-9-]+)/i)?.[1] ?? line.match(/\bconnectorId[=:]\"?([a-z0-9-]+)/i)?.[1];
}

export function redactCloudflaredLogLine(line: string): string {
  return line
    .replace(/(--token\s+)[^\s\]]+/gi, '$1*****')
    .replace(/(token:)[^\s\]]+/gi, '$1*****')
    .replace(/(TUNNEL_TOKEN:)[^\s\]]+/gi, '$1*****')
    .replace(/([A-Z0-9_]*(?:TOKEN|KEY|SECRET)[A-Z0-9_]*:)[^\s\]]+/gi, '$1*****')
    .replace(/([A-Z0-9_]*(?:TOKEN|KEY|SECRET)[A-Z0-9_]*=)[^\s\]]+/gi, '$1*****')
    .replace(/(IMAGE_STUDIO_TUNNEL_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****')
    .replace(/(IMAGE_STUDIO_CLOUDFLARED_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****');
}
