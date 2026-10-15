import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/http'
import type { Playlist } from '@/lib/api/types'
import { usePlayerStore } from '@/stores/player-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** "Save queue as playlist": creates a playlist with the given name and adds
 * every library track currently in the queue, in queue order. Radio stations
 * aren't media files, so they're skipped. */
export function SaveQueueDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: async (playlistName: string) => {
      const ids = usePlayerStore
        .getState()
        .queue.filter((track) => !track.isRadio)
        .map((track) => track.id)
      const playlist = await apiFetch<Playlist>('/api/playlist', {
        method: 'POST',
        body: { name: playlistName, public: false },
      })
      if (ids.length > 0) {
        await apiFetch(`/api/playlist/${playlist.id}/tracks`, {
          method: 'POST',
          body: { ids },
        })
      }
      return playlist
    },
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: ['playlist'] })
      setName('')
      onOpenChange(false)
      onSaved?.()
      navigate({
        to: '/playlist/$playlistId',
        params: { playlistId: playlist.id },
      })
    },
    onError: () => toast.error(t('errors.actionFailed')),
  })

  const trimmed = name.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('player.queue.saveTitle')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (trimmed) mutation.mutate(trimmed)
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('player.queue.playlistName')}
            aria-label={t('player.queue.playlistName')}
          />
          <DialogFooter>
            <Button type="submit" disabled={!trimmed || mutation.isPending}>
              {t('player.queue.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
