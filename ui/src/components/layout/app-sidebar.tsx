import { useMemo, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import {
  Home,
  Search,
  Disc3,
  Mic2,
  Radio,
  Settings,
  ChevronLeft,
  ChevronDown,
  Pin,
  ListMusic,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useResourceList } from "@/hooks/use-resource-list"
import type { Playlist } from "@/lib/api/types"
import { useUiStore } from "@/stores/ui-store"
import { useLibraryStore } from "@/stores/library-store"
import { LibrarySwitcher } from "@/components/layout/library-switcher"

const primaryNav = [
  { to: "/" as const, icon: Home, labelKey: "nav.home" },
  { to: "/search" as const, icon: Search, labelKey: "nav.search" },
  { to: "/albums" as const, icon: Disc3, labelKey: "nav.albums" },
  { to: "/artists" as const, icon: Mic2, labelKey: "nav.artists" },
  { to: "/radio" as const, icon: Radio, labelKey: "nav.radio" },
]

export function AppSidebar() {
  const { t } = useTranslation()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside
      data-slot="app-sidebar"
      className={cn(
        "flex h-full flex-col gap-2 bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            {t("app.name")}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="ml-auto"
        >
          <ChevronLeft
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      {!collapsed && <LibrarySwitcher />}

      <nav className="flex flex-col gap-1 px-2">
        {primaryNav.map(({ to, icon: Icon, labelKey }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{t(labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      {!collapsed && <YourLibrarySection pathname={pathname} />}

      <div className="px-2 pb-3">
        <Link
          to="/admin"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
            pathname.startsWith("/admin")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground",
          )}
        >
          <Settings className="size-5 shrink-0" />
          {!collapsed && <span>{t("nav.admin")}</span>}
        </Link>
      </div>
    </aside>
  )
}

function YourLibrarySection({ pathname }: { pathname: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const [filterText, setFilterText] = useState("")
  const pinnedIds = useLibraryStore((s) => s.pinnedPlaylistIds)
  const togglePin = useLibraryStore((s) => s.togglePinnedPlaylist)

  const { data } = useResourceList<Playlist>("playlist", {
    sort: "name",
    order: "ASC",
    end: 200,
  })

  const playlists = useMemo(() => {
    const all = data?.data ?? []
    const filtered = filterText
      ? all.filter((p) =>
          p.name.toLowerCase().includes(filterText.toLowerCase()),
        )
      : all
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id)
      const bPinned = pinnedIds.includes(b.id)
      return aPinned === bPinned ? 0 : aPinned ? -1 : 1
    })
  }, [data, filterText, pinnedIds])

  return (
    <div className="flex min-h-0 flex-1 flex-col px-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 rounded-md px-1 py-2 text-sm font-semibold text-muted-foreground hover:text-sidebar-foreground"
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            !expanded && "-rotate-90",
          )}
        />
        <Link
          to="/playlists"
          onClick={(e) => e.stopPropagation()}
          className="hover:text-sidebar-foreground"
        >
          {t("nav.library")}
        </Link>
      </button>

      {expanded && (
        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="relative px-1 pb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter playlists"
              className="h-7 pl-8 text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No playlists yet.
              </p>
            ) : (
              playlists.map((playlist) => {
                const active = pathname === `/playlist/${playlist.id}`
                const pinned = pinnedIds.includes(playlist.id)
                return (
                  <div
                    key={playlist.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:text-sidebar-foreground",
                    )}
                  >
                    <ListMusic className="size-4 shrink-0" />
                    <Link
                      to="/playlist/$playlistId"
                      params={{ playlistId: playlist.id }}
                      className="min-w-0 flex-1 truncate"
                    >
                      {playlist.name}
                    </Link>
                    <button
                      type="button"
                      aria-label={pinned ? "Unpin playlist" : "Pin playlist"}
                      aria-pressed={pinned}
                      onClick={() => togglePin(playlist.id)}
                      className={cn(
                        "shrink-0 opacity-0 group-hover:opacity-100",
                        pinned && "text-primary opacity-100",
                      )}
                    >
                      <Pin
                        className={cn("size-3.5", pinned && "fill-current")}
                      />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
