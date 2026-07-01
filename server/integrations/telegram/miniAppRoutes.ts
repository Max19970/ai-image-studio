import type express from 'express';
import { sendServerError } from '../../http/errors';
import { HttpError } from '../../http/httpError';
import { loadIntegrationRuntimeConfig } from '../../storage/integrationSettingsStore';
import { validateTelegramMiniAppInitData } from './miniAppAuth';

interface TelegramValidatedUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export const telegramMiniAppRouteContribution = {
  id: 'telegram-mini-app',
  register: registerTelegramMiniAppRoutes
};

export function registerTelegramMiniAppRoutes(app: express.Express) {
  app.post('/api/integrations/telegram/mini-app/validate', (req, res) => {
    try {
      const initData = typeof req.body?.initData === 'string' ? req.body.initData : '';
      const config = loadIntegrationRuntimeConfig('telegram');
      const botToken = typeof config.secrets.botToken === 'string' ? config.secrets.botToken : '';
      const result = validateTelegramMiniAppInitData(initData, botToken);
      if (!result.ok) throw new HttpError(result.message, 401);

      const user = parseValidatedUser(result.fields?.user);
      const allowedUserIds = parseAllowedTelegramUserIds(config.values.allowedUserIds);
      if (allowedUserIds.size > 0 && (!user || !allowedUserIds.has(user.id))) {
        throw new HttpError('Telegram Mini App user is not allowed for this integration.', 403);
      }

      res.json({
        ok: true,
        message: 'Telegram Mini App session is valid.',
        user,
        authDate: Number(result.fields?.auth_date ?? 0) || undefined
      });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

function parseValidatedUser(rawUser: string | undefined): TelegramValidatedUser | undefined {
  if (!rawUser) return undefined;
  try {
    const parsed = JSON.parse(rawUser) as Record<string, unknown>;
    const id = typeof parsed.id === 'number' && Number.isFinite(parsed.id) ? parsed.id : null;
    if (id === null) return undefined;
    return {
      id,
      username: asString(parsed.username),
      firstName: asString(parsed.first_name),
      lastName: asString(parsed.last_name)
    };
  } catch {
    return undefined;
  }
}

function parseAllowedTelegramUserIds(value: unknown): Set<number> {
  if (typeof value !== 'string') return new Set();
  return new Set(
    value
      .split(/[\s,;]+/)
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
