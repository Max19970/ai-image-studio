export type TelegramMiniAppAuthState = 'idle' | 'validating' | 'valid' | 'invalid' | 'unavailable';

export interface TelegramMiniAppSafeAreaInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TelegramMiniAppThemeSnapshot {
  colorScheme: 'light' | 'dark' | string;
  backgroundColor?: string;
  textColor?: string;
  secondaryBackgroundColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  headerBackgroundColor?: string;
  bottomBarBackgroundColor?: string;
}

export interface TelegramMiniAppViewportSnapshot {
  height: number | null;
  stableHeight: number | null;
  safeAreaInset: TelegramMiniAppSafeAreaInset;
  contentSafeAreaInset: TelegramMiniAppSafeAreaInset;
}

export interface TelegramMiniAppAuthResponse {
  ok: boolean;
  message: string;
  user?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  authDate?: number;
}

export interface TelegramMiniAppState {
  available: boolean;
  platform: string | null;
  version: string | null;
  authState: TelegramMiniAppAuthState;
  authMessage: string | null;
  user: TelegramMiniAppAuthResponse['user'] | null;
  theme: TelegramMiniAppThemeSnapshot;
  viewport: TelegramMiniAppViewportSnapshot;
}
