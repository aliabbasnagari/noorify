import { ThemeProvider as NextThemesProvider } from "next-themes"
import { config } from "@/lib/config"

// v1 ships exactly two themes (Dark, Spotify-exact, default + Light) — see
// the plan's "Explicit v1 scope exclusions". `defaultTheme` still respects
// the server-sent config so a self-hosted instance can pin Light instead.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      storageKey="nd-theme"
      defaultTheme={
        config.defaultTheme?.toLowerCase() === "light" ? "light" : "dark"
      }
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
