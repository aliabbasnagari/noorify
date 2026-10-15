import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { config } from '@/lib/config'
import { THEMES, themeFromConfig } from '@/lib/themes'

// Dark (Spotify-exact, default) and Light, plus the Solarized pair ported from
// upstream. `defaultTheme` still respects the server-sent config so a
// self-hosted instance can pin another theme instead (e.g. "Solarized Light").
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey="nd-theme"
      themes={[...THEMES]}
      defaultTheme={themeFromConfig(config.defaultTheme)}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
