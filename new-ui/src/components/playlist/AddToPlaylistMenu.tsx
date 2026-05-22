/**
 * AddToPlaylistMenu
 *
 * Shows which playlists already contain the song (✓ checkmark).
 * Clicking a playlist that already has the song prompts to remove it.
 * Clicking a playlist that doesn't have it adds the song.
 *
 * Uses shadcn Popover with a virtualRef anchor for positioning.
 */

import { useEffect, useRef, useState } from 'react'
import { Check, ListPlus, Loader, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPlaylist, getPlaylist, getPlaylists, updatePlaylist } from '@/lib/subsonic'
import type { SubsonicPlaylist } from '@/lib/subsonic'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface SongStatus {
  contains: boolean
  /** Index of the song inside the playlist (needed for removal). -1 if absent. */
  songIndex: number
}

interface Props {
  songId: string
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
}

export function AddToPlaylistMenu({ songId, open, anchorEl, onClose }: Props) {
  const [playlists, setPlaylists] = useState<SubsonicPlaylist[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, SongStatus>>({})
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  const newInputRef = useRef<HTMLInputElement>(null)
  // VirtualRef for the Popover anchor — points to whatever button triggered the menu
  const virtualRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    virtualRef.current = anchorEl
  }, [anchorEl])

  // ── Fetch playlists + check membership on open ────────────────────────────
  useEffect(() => {
    if (!open) return
    setQuery('')
    setIsCreating(false)
    setNewName('')
    setSavingNew(false)
    setBusyId(null)
    setConfirmRemoveId(null)
    setStatusMap({})
    setCheckingIds(new Set())

    getPlaylists().then((pls) => {
      setPlaylists(pls)
      const ids = new Set(pls.map((p) => p.id))
      setCheckingIds(ids)

      pls.forEach(async (pl) => {
        try {
          const full = await getPlaylist(pl.id)
          const idx = (full.entry ?? []).findIndex((s) => s.id === songId)
          setStatusMap((prev) => ({
            ...prev,
            [pl.id]: { contains: idx !== -1, songIndex: idx },
          }))
        } catch {
          setStatusMap((prev) => ({
            ...prev,
            [pl.id]: { contains: false, songIndex: -1 },
          }))
        } finally {
          setCheckingIds((prev) => {
            const next = new Set(prev)
            next.delete(pl.id)
            return next
          })
        }
      })
    }).catch(() => setPlaylists([]))
  }, [open, songId])

  useEffect(() => {
    if (isCreating) setTimeout(() => newInputRef.current?.focus(), 30)
  }, [isCreating])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRowClick = (pl: SubsonicPlaylist) => {
    const status = statusMap[pl.id]
    if (checkingIds.has(pl.id) || busyId === pl.id) return

    if (status?.contains) {
      setConfirmRemoveId((prev) => (prev === pl.id ? null : pl.id))
      return
    }

    setConfirmRemoveId(null)
    setBusyId(pl.id)
    updatePlaylist(pl.id, { songIdToAdd: [songId] })
      .then(() => {
        setStatusMap((prev) => ({
          ...prev,
          [pl.id]: { contains: true, songIndex: (pl.songCount ?? 0) },
        }))
        setTimeout(onClose, 900)
      })
      .catch(() => {})
      .finally(() => setBusyId(null))
  }

  const handleRemove = (plId: string) => {
    const status = statusMap[plId]
    if (!status || status.songIndex === -1) return
    setBusyId(plId)
    setConfirmRemoveId(null)
    updatePlaylist(plId, { songIndexToRemove: [status.songIndex] })
      .then(() => {
        setStatusMap((prev) => ({
          ...prev,
          [plId]: { contains: false, songIndex: -1 },
        }))
      })
      .catch(() => {})
      .finally(() => setBusyId(null))
  }

  const handleCreateAndAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSavingNew(true)
    try {
      const pl = await createPlaylist(name)
      await updatePlaylist(pl.id, { songIdToAdd: [songId] })
      setPlaylists((prev) => [...prev, pl])
      setStatusMap((prev) => ({
        ...prev,
        [pl.id]: { contains: true, songIndex: 0 },
      }))
      setTimeout(onClose, 900)
    } catch {
      setSavingNew(false)
    }
  }

  const filtered = playlists.filter(
    (p) => !query || p.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <PopoverAnchor virtualRef={virtualRef as React.RefObject<Element>} />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[240px] p-0 bg-[#282828] border-white/10 text-white rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <p className="text-xs font-bold text-white uppercase tracking-widest">Add to playlist</p>
        </div>

        {/* Create new */}
        {isCreating ? (
          <div className="px-3 py-2 border-b border-white/10">
            <Input
              ref={newInputRef}
              type="text"
              placeholder="Playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateAndAdd()
                if (e.key === 'Escape') setIsCreating(false)
              }}
              className="h-7 text-xs bg-[#3e3e3e] border-0 text-white placeholder:text-[#a7a7a7] mb-2 focus-visible:ring-white/30"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-1 rounded-full text-xs font-semibold border border-white/20 text-[#a7a7a7] hover:text-white hover:border-white/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAndAdd}
                disabled={savingNew || !newName.trim()}
                className="flex-1 py-1 rounded-full text-xs font-bold bg-[#1db954] text-black hover:bg-[#1ed760] transition-colors disabled:opacity-50"
              >
                {savingNew ? '…' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setIsCreating(true); setConfirmRemoveId(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-[#3e3e3e] transition-colors border-b border-white/10"
          >
            <Plus size={14} className="text-[#a7a7a7]" />
            New playlist
          </button>
        )}

        {/* Inline remove-confirm prompt */}
        {confirmRemoveId && (
          <div className="px-3 py-2.5 bg-[#1e1e1e] border-b border-white/10">
            <p className="text-xs font-semibold text-white truncate mb-0.5">
              Remove from playlist?
            </p>
            <p className="text-xs text-[#a7a7a7] truncate mb-2">
              "{playlists.find((p) => p.id === confirmRemoveId)?.name}"
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-1 rounded-full text-xs font-semibold border border-white/20 text-[#a7a7a7] hover:text-white hover:border-white/50 transition-colors"
              >
                No
              </button>
              <button
                onClick={() => handleRemove(confirmRemoveId)}
                className="flex-1 py-1 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {playlists.length > 5 && (
          <div className="px-3 py-2 border-b border-white/10 relative">
            <Search size={12} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#a7a7a7]" />
            <input
              type="text"
              placeholder="Find a playlist"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#3e3e3e] text-white text-xs placeholder-[#a7a7a7] rounded pl-6 pr-2 py-1.5 outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
        )}

        {/* Playlist rows */}
        <div className="overflow-y-auto max-h-[200px]">
          {playlists.length === 0 && checkingIds.size === 0 ? (
            <p className="px-3 py-3 text-xs text-[#a7a7a7]">No playlists found</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[#a7a7a7]">No playlists match</p>
          ) : (
            filtered.map((pl) => {
              const status = statusMap[pl.id]
              const isChecking = checkingIds.has(pl.id)
              const isBusy = busyId === pl.id
              const inPlaylist = status?.contains ?? false
              const isConfirming = confirmRemoveId === pl.id

              return (
                <button
                  key={pl.id}
                  onClick={() => handleRowClick(pl)}
                  disabled={isBusy || isChecking}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#3e3e3e] transition-colors text-left',
                    inPlaylist ? 'text-[#1db954]' : 'text-white',
                    isConfirming && 'bg-[#3e3e3e]',
                  )}
                >
                  <ListPlus
                    size={14}
                    className={cn('flex-shrink-0', inPlaylist ? 'text-[#1db954]' : 'text-[#a7a7a7]')}
                  />
                  <span className="truncate flex-1">{pl.name}</span>
                  {(isChecking || isBusy) ? (
                    <Loader size={12} className="flex-shrink-0 text-[#a7a7a7] animate-spin" />
                  ) : inPlaylist ? (
                    <Check size={13} className="text-[#1db954] flex-shrink-0" />
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
