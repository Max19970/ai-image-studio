import type { ChildProcess } from 'node:child_process';

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
  readonly spawnProcess?: typeof import('node:child_process').spawn;
  readonly spawnCleanupProcess?: typeof import('node:child_process').spawnSync;
}

export interface TunnelTemplateValues {
  readonly targetUrl: string;
  readonly host: string;
  readonly port: string;
}

export interface CloudflaredRuntimeIds {
  readonly tunnelId?: string;
  readonly connectorId?: string;
}

export interface CloudflaredTunnelRuntimeState {
  tunnelId?: string;
  connectorId?: string;
  cleanupStarted: boolean;
  stopStarted: boolean;
}
