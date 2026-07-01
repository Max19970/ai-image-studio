import interfaceThemeData from '../../data/interface-themes.json';
import type { InterfaceTheme } from '../../domain/studioSettings';

export type InterfaceThemePreviewClasses = {
  choice: string;
  preview: string;
  accent: string;
};

export type InterfaceThemeDescriptor = {
  id: InterfaceTheme;
  accent: string;
  font: string;
  classKeys?: Partial<InterfaceThemePreviewClasses>;
};

const themePreviewOptions = interfaceThemeData as InterfaceThemeDescriptor[];

export const interfaceThemeDescriptors = themePreviewOptions.map((theme) => ({
  ...theme,
  classKeys: {
    choice: theme.classKeys?.choice ?? `themeChoice${toPascalCase(theme.id)}`,
    preview: theme.classKeys?.preview ?? `themeSwatch${toPascalCase(theme.id)}`,
    accent: theme.classKeys?.accent ?? `themeAccent${toPascalCase(theme.id)}`
  }
}));

export const interfaceThemes = interfaceThemeDescriptors.map((theme) => theme.id);

export const themePreviewMeta = Object.fromEntries(
  interfaceThemeDescriptors.map((theme) => [theme.id, { accent: theme.accent, font: theme.font, classKeys: theme.classKeys }])
) as Record<InterfaceTheme, { accent: string; font: string; classKeys: InterfaceThemePreviewClasses }>;

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
