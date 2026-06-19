import type { TelegramBotApiPort, TelegramRuntimeOptions, TelegramUpdate } from './types';
import { isUserAllowed } from './types';

const restrictedMessage = 'This Image Studio bot is restricted to allowed Telegram users.';

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  config: TelegramRuntimeOptions,
  client: TelegramBotApiPort
): Promise<boolean> {
  const message = update.message;
  if (!message?.text || !message.text.trim().startsWith('/start')) return false;

  if (!isUserAllowed(message.from?.id, config.allowedUserIds)) {
    await client.sendMessage(message.chat.id, restrictedMessage);
    return true;
  }

  await client.sendMessage(message.chat.id, config.startMessage, {
    inline_keyboard: [[{ text: config.menuButtonText, web_app: { url: config.miniAppUrl } }]]
  });
  return true;
}
