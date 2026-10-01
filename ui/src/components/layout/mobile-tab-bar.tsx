import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Home, Search, Library } from "lucide-react"
import { cn } from "cn"

const TABS = [
  { to: "/" as const, icon: Home, labelKey: "nav.home" },
  { to: "/search" as const, icon: Search, labelKey: "nav.search" },
  { to: "/library" as const, icon: Library, labelKey: "nav.library" },
]

/** Spotify's own mobile web nav is exactly these three tabs (Home/Search/
 * Your Library) — everything else (Albums/Artists/Songs/Radio/Playlists) lives
 * inside the Library tab (library-page.tsx) rather than each getting its
 * own bottom-bar slot, which wouldn't fit at phone width anyway. */
export function MobileTabBar() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      data-slot="mobile-tab-bar"
      className="grid grid-cols-3 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map(({ to, icon: Icon, labelKey }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-xs font-medium",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {t(labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
