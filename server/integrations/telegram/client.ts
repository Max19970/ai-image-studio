import type {
  TelegramBotApiPort,
  TelegramBotCommand,
  TelegramBotUser,
  TelegramGetUpdatesOptions,
  TelegramInlineKeyboardMarkup,
  TelegramMenuButtonWebApp,
  TelegramChatId,
  TelegramUpdate
} from './types';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class TelegramBotApiClient implements TelegramBotApiPort {
  constructor(
    private readonly botToken: string,
    private readonly baseUrl = 'https://api.telegram.org'
  ) {}

  async getMe(signal?: AbortSignal): Promise<TelegramBotUser> {
    return this.call<TelegramBotUser>('getMe', {}, signal);
  }

  async deleteWebhook(dropPendingUpdates = false, signal?: AbortSignal): Promise<boolean> {
    return this.call<boolean>('deleteWebhook', { drop_pending_updates: dropPendingUpdates }, signal);
  }

  async setChatMenuButton(menuButton: TelegramMenuButtonWebApp, signal?: AbortSignal): Promise<boolean> {
    return this.call<boolean>('setChatMenuButton', { menu_button: menuButton }, signal);
  }

  async setMyCommands(commands: TelegramBotCommand[], signal?: AbortSignal): Promise<boolean> {
    return this.call<boolean>('setMyCommands', { commands }, signal);
  }

  async sendMessage(
    chatId: TelegramChatId,
    text: string,
    replyMarkup?: TelegramInlineKeyboardMarkup,
    signal?: AbortSignal
  ): Promise<unknown> {
    return this.call('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup }, signal);
  }

  async getUpdates(options: TelegramGetUpdatesOptions, signal?: AbortSignal): Promise<TelegramUpdate[]> {
    return this.call<TelegramUpdate[]>('getUpdates', options, signal);
  }

  private async call<T>(method: string, payload: object, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${this.baseUrl}/bot${this.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });
    const body = await readTelegramResponse<T>(response);
    if (!body.ok || body.result === undefined) {
      throw new Error(describeTelegramError(method, body));
    }
    return body.result;
  }
}

async function readTelegramResponse<T>(response: Response): Promise<TelegramApiResponse<T>> {
  try {
    return await response.json() as TelegramApiResponse<T>;
  } catch {
    return { ok: false, error_code: response.status, description: response.statusText || 'Invalid JSON response' };
  }
}

function describeTelegramError(method: string, body: TelegramApiResponse<unknown>): string {
  const code = typeof body.error_code === 'number' ? ` (${body.error_code})` : '';
  const description = body.description || 'Telegram Bot API request failed.';
  return `Telegram ${method} failed${code}: ${description}`;
}
