import type { ReactNode } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  Users,
  Database,
  Speaker,
  SlidersHorizontal,
  FileWarning,
  Puzzle,
} from "lucide-react"
import { cn } from "cn"
import { config } from "@/lib/config"

const ADMIN_NAV = [
  { to: "/admin/users" as const, icon: Users, label: "Users" },
  { to: "/admin/libraries" as const, icon: Database, label: "Libraries" },
  { to: "/admin/players" as const, icon: Speaker, label: "Players" },
  {
    to: "/admin/transcoding" as const,
    icon: SlidersHorizontal,
    label: "Transcoding",
  },
  {
    to: "/admin/missing-files" as const,
    icon: FileWarning,
    label: "Missing Files",
  },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const nav = config.pluginsEnabled
    ? [...ADMIN_NAV, { to: "/admin/plugins" as const, icon: Puzzle, label: "Plugins" }]
    : ADMIN_NAV

  return (
    <div className="flex gap-8 py-8">
      <nav className="w-44 shrink-0 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
