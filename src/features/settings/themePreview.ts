import interfaceThemeData from '../../data/interface-themes.json';
import type { InterfaceTheme } from '../../domain/studioSettings';

type ThemePreview = { id: InterfaceTheme; accent: string; font: string };

const themePreviewOptions = interfaceThemeData as ThemePreview[];

export const interfaceThemes = themePreviewOptions.map((theme) => theme.id);

export const themePreviewMeta = Object.fromEntries(
  themePreviewOptions.map((theme) => [theme.id, { accent: theme.accent, font: theme.font }])
) as Record<InterfaceTheme, { accent: string; font: string }>;
