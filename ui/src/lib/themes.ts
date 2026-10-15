// Theme ids registered with next-themes. Each id is applied as a class on
// <html> and has a matching token block in index.css.
export const THEMES = [
  'dark',
  'light',
  'solarized-dark',
  'solarized-light',
] as const

export type ThemeId = (typeof THEMES)[number]

const DARK_THEMES: readonly string[] = ['dark', 'solarized-dark']

/** Whether the theme has a dark surface (for libraries that only know light/dark). */
export function isDarkTheme(theme: string | undefined): boolean {
  return theme !== undefined && DARK_THEMES.includes(theme)
}

/** Maps the server's `defaultTheme` config onto a registered theme id. */
export function themeFromConfig(name: string | undefined): ThemeId {
  const id = (name ?? '').toLowerCase().replace(/\s+/g, '-')
  return (THEMES as readonly string[]).includes(id) ? (id as ThemeId) : 'dark'
}
