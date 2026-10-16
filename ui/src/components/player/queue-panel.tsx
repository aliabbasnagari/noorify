import { useState, type ReactElement } from 'react'
import { ListMusic } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { QueueList } from '@/components/player/queue-list'
import { playerButtonFx } from '@/components/player/button-fx'
import { usePlayerStore } from '@/stores/player-store'

/** The queue as a slide-in Sheet — used on mobile/narrow layouts where
 * there's no room for the desktop right rail's inline Queue tab. */
export function QueuePanel({ trigger }: { trigger?: ReactElement }) {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon-lg"
              className={playerButtonFx}
              aria-label={t('player.queue.title')}
            />
          )
        }
      >
        {trigger ? t('nowPlaying.openQueue') : <ListMusic />}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-96 flex-col">
        <SheetHeader>
          <SheetTitle>
            {t('player.queue.title')}
            {queue.length > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                {queue.length}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <QueueList />
        </div>
      </SheetContent>
    </Sheet>
  )
}
