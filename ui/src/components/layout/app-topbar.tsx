import { useState } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AboutDialog } from "@/components/layout/about-dialog"
import { ScanStatusWidget } from "@/components/layout/scan-status-widget"
import { config } from "@/lib/config"
import { logout, useAuthStore } from "@/stores/auth-store"

export function AppTopbar() {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const { theme, setTheme } = useTheme()
  const [aboutOpen, setAboutOpen] = useState(false)

  const initials = (session?.name || session?.username || "?")
    .slice(0, 2)
    .toUpperCase()

  return (
    <header
      data-slot="app-topbar"
      className="flex h-14 shrink-0 items-center justify-between gap-4 bg-background/80 px-4 backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-sm"
          className="rounded-full"
          onClick={() => router.history.back()}
          aria-label={t("common.back")}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="rounded-full"
          onClick={() => router.history.forward()}
          aria-label={t("common.forward")}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {session?.isAdmin && <ScanStatusWidget />}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="rounded-full p-0.5" />}
          >
            <Avatar className="size-8">
              <AvatarImage src={session?.avatar} alt={session?.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === "light" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
                {t("common.theme")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="dark">
                    {t("common.themeDark")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light">
                    {t("common.themeLight")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {config.enableSharing && (
              <DropdownMenuItem render={<Link to="/shares" />}>
                {t("common.yourShares")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              About Navidrome
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (!logout()) router.navigate({ to: "/login" })
              }}
            >
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      </div>
    </header>
  )
}
