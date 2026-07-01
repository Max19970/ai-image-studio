import type { HostEnvironmentDescriptor, HostEnvironmentState } from '../../infrastructure/host-environment/types';
import { requestTelegramMiniAppImageDownload, shouldUseTelegramMiniAppDownload } from './downloadFile';
import type { TelegramMiniAppState } from './types';
import { useTelegramMiniApp } from './useTelegramMiniApp';

export interface TelegramHostEnvironmentState extends HostEnvironmentState {
  telegram: TelegramMiniAppState;
}

export const telegramMiniAppHostEnvironment = {
  id: 'telegram-mini-app',
  order: 10,
  useState: () => {
    const telegram = useTelegramMiniApp();
    return {
      id: 'telegram-mini-app',
      available: telegram.available,
      platform: telegram.platform,
      authState: telegram.authState,
      telegram
    };
  },
  getAppDecorations: (state) => state.available ? {
    classNames: ['telegram-mini-app'],
    dataAttributes: {
      'data-telegram-mini-app': 'true',
      'data-telegram-platform': state.telegram.platform ?? undefined,
      'data-telegram-auth-state': state.telegram.authState
    }
  } : {
    dataAttributes: {
      'data-telegram-auth-state': state.telegram.authState
    }
  },
  imageFileTransport: {
    id: 'telegram-mini-app-image-file',
    isAvailable: shouldUseTelegramMiniAppDownload,
    saveImage: ({ href, filename, storageAssetKey }) => requestTelegramMiniAppImageDownload({ href, filename, storageAssetKey })
  }
} satisfies HostEnvironmentDescriptor<TelegramHostEnvironmentState>;

export const hostEnvironmentDescriptor = telegramMiniAppHostEnvironment;
