import { useState } from 'react'
import { Bookmark, Play, Trash2, Clock } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getBookmarks, deleteBookmark, getCoverArtUrl, type SubsonicBookmark } from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { useToast } from '@/contexts/ToastContext'

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatPosition(ms: number): string {
  return formatDuration(Math.floor(ms / 1000))
}

export function Bookmarks() {
  const toast = useToast()
  const { playTrack, seek } = usePlayer()
  const { data: bookmarks, isLoading, refetch } = useFetch(getBookmarks, [])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handlePlay = (bookmark: SubsonicBookmark) => {
    // Play track then seek to the bookmarked position
    playTrack(bookmark.entry)
    // Seek after a short delay to let the audio element load
    const positionSecs = bookmark.position / 1000
    setTimeout(() => seek(positionSecs), 500)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteBookmark(id)
      toast.success('Bookmark removed')
      refetch()
    } catch {
      toast.error('Failed to remove bookmark')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Bookmarks" />
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bookmark size={24} className="text-[#1db954]" />
          <h1 className="text-2xl font-bold text-white">Bookmarks</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#282828] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (bookmarks ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark size={48} className="text-[#a7a7a7] mb-4 opacity-40" />
            <p className="text-[#a7a7a7] text-lg">No bookmarks yet</p>
            <p className="text-[#a7a7a7] text-sm mt-1">
              Bookmark a track while playing to resume it later.
            </p>
          </div>
        ) : (
          <div className="bg-[#282828] rounded-xl overflow-hidden">
            {(bookmarks ?? []).map((bookmark) => {
              const song = bookmark.entry
              const coverUrl = getCoverArtUrl(song.coverArt)
              const positionPct = song.duration ? (bookmark.position / 1000 / song.duration) * 100 : 0
              return (
                <div
                  key={song.id}
                  className="group flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                >
                  {/* Cover art */}
                  <div className="relative w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-[#3e3e3e]">
                    {coverUrl && (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {/* Play overlay */}
                    <button
                      onClick={() => handlePlay(bookmark)}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`Play from ${formatPosition(bookmark.position)}`}
                    >
                      <Play size={18} fill="white" className="text-white" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                    <p className="text-xs text-[#a7a7a7] truncate">{song.artist}{song.album ? ` — ${song.album}` : ''}</p>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden w-full max-w-xs">
                      <div
                        className="h-full bg-[#1db954] rounded-full"
                        style={{ width: `${positionPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Position / duration */}
                  <div className="flex items-center gap-1 text-xs text-[#a7a7a7] flex-shrink-0">
                    <Clock size={11} />
                    <span>{formatPosition(bookmark.position)}</span>
                    {song.duration ? <span>/ {formatDuration(song.duration)}</span> : null}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(song.id)}
                    disabled={deletingId === song.id}
                    className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    title="Remove bookmark"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
