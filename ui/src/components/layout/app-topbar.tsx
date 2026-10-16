import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AboutDialog } from '@/components/layout/about-dialog'
import { ScanStatusWidget } from '@/components/layout/scan-status-widget'
import { SearchBar } from '@/components/layout/search-bar'
import { config } from '@/lib/config'
import { logout, useAuthStore } from '@/stores/auth-store'

export function AppTopbar() {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const [aboutOpen, setAboutOpen] = useState(false)

  const initials = (session?.name || session?.username || '?')
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
          aria-label={t('common.back')}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="rounded-full"
          onClick={() => router.history.forward()}
          aria-label={t('common.forward')}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block">
        <SearchBar />
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
            <DropdownMenuItem render={<Link to="/personal" />}>
              {t('personal.title')}
            </DropdownMenuItem>
            {config.enableSharing && (
              <DropdownMenuItem render={<Link to="/shares" />}>
                {t('common.yourShares')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              About Noorify
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (!logout()) router.navigate({ to: '/login' })
              }}
            >
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      </div>
    </header>
  )
}
