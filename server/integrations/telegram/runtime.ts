import type { IntegrationActionResult, IntegrationRuntimeConfig, IntegrationRuntimeStatus } from '../types';
import { TelegramBotApiClient } from './client';
import { handleTelegramUpdate } from './updateHandler';
import type { TelegramBotApiPort, TelegramRuntimeOptions } from './types';
import { resolveTelegramRuntimeConfig } from './types';

type ClientFactory = (botToken: string) => TelegramBotApiPort;

export class TelegramPollingRuntime {
  private status: IntegrationRuntimeStatus = createStatus('stopped', 'Telegram bot is stopped.');
  private config: TelegramRuntimeOptions | null = null;
  private client: TelegramBotApiPort | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private nextOffset: number | undefined;

  constructor(private readonly createClient: ClientFactory = (token) => new TelegramBotApiClient(token)) {}

  getStatus(): IntegrationRuntimeStatus {
    return { ...this.status, metadata: this.status.metadata ? { ...this.status.metadata } : undefined };
  }

  async start(runtimeConfig: IntegrationRuntimeConfig): Promise<IntegrationActionResult> {
    const resolved = resolveTelegramRuntimeConfig(runtimeConfig);
    if (!resolved.ok || !resolved.config) return this.fail(resolved.message ?? 'Invalid Telegram configuration.');
    if (this.status.state === 'running' || this.status.state === 'starting') {
      return { ok: true, message: 'Telegram bot is already running.', status: this.getStatus() };
    }

    this.setStatus('starting', 'Starting Telegram bot polling…');
    this.config = resolved.config;
    this.client = this.createClient(resolved.config.botToken);

    try {
      await this.client.deleteWebhook(false);
      const bot = await this.client.getMe();
      await this.client.setMyCommands([{ command: 'start', description: 'Open Image Studio' }]);
      this.setStatus('running', `Telegram bot is running as @${bot.username ?? bot.first_name}.`, Date.now(), {
        username: bot.username,
        launchMode: resolved.config.launchMode
      });
      this.schedule(0);
      return { ok: true, message: 'Telegram bot started.', status: this.getStatus() };
    } catch (error) {
      this.clearRuntimeHandles();
      return this.fail(describeError(error));
    }
  }

  async stop(): Promise<IntegrationActionResult> {
    if (this.status.state === 'stopped') {
      return { ok: true, message: 'Telegram bot is already stopped.', status: this.getStatus() };
    }
    this.setStatus('stopping', 'Stopping Telegram bot…', this.status.startedAt);
    this.clearRuntimeHandles();
    this.config = null;
    this.client = null;
    this.setStatus('stopped', 'Telegram bot stopped.');
    return { ok: true, message: 'Telegram bot stopped.', status: this.getStatus() };
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => void this.pollOnce(), delayMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.config || !this.client || this.status.state !== 'running') return;
    this.abortController = new AbortController();

    try {
      const updates = await this.client.getUpdates({ offset: this.nextOffset, timeout: 0, allowed_updates: ['message'] }, this.abortController.signal);
      for (const update of updates) {
        this.nextOffset = update.update_id + 1;
        await handleTelegramUpdate(update, this.config, this.client);
      }
      this.setStatus('running', 'Telegram bot polling is active.', this.status.startedAt, {
        nextOffset: this.nextOffset,
        launchMode: this.config.launchMode
      });
      this.schedule(this.config.pollingIntervalMs);
    } catch (error) {
      if (this.abortController.signal.aborted) return;
      this.clearRuntimeHandles();
      this.fail(describeError(error));
    }
  }

  private clearRuntimeHandles(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abortController?.abort();
    this.abortController = null;
  }

  private fail(message: string): IntegrationActionResult {
    this.setStatus('error', message);
    return { ok: false, message, status: this.getStatus() };
  }

  private setStatus(
    state: IntegrationRuntimeStatus['state'],
    message: string,
    startedAt: number | null = state === 'running' ? Date.now() : null,
    metadata?: Record<string, unknown>
  ): void {
    this.status = { id: 'telegram', state, startedAt, updatedAt: Date.now(), message, metadata };
  }
}

function createStatus(state: IntegrationRuntimeStatus['state'], message: string): IntegrationRuntimeStatus {
  return { id: 'telegram', state, startedAt: null, updatedAt: Date.now(), message };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
