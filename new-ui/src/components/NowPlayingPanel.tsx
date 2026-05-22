import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNowPlaying, getCoverArtUrl, type NowPlayingEntry } from '@/lib/subsonic'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

function timeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return 'just now'
  if (minutesAgo === 1) return '1m ago'
  if (minutesAgo < 60) return `${minutesAgo}m ago`
  return `${Math.floor(minutesAgo / 60)}h ago`
}

export function NowPlayingPanel() {
  const [entries, setEntries] = useState<NowPlayingEntry[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const poll = async () => {
      const data = await getNowPlaying()
      if (mounted) setEntries(data)
    }
    poll()
    const interval = setInterval(poll, 30_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  if (entries.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
            open ? 'bg-[#282828] text-white' : 'text-[#a7a7a7] hover:text-white',
          )}
          title="Who's listening now"
        >
          <Users size={14} />
          <span>{entries.length}</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#1db954] rounded-full animate-pulse" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-0 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl"
      >
        <div className="px-3 py-2 border-b border-white/10">
          <p className="text-xs font-semibold text-[#a7a7a7] uppercase tracking-wider">Now Listening</p>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {entries.map((e) => {
            const cover = getCoverArtUrl(e.coverArt, 40)
            return (
              <div key={`${e.username}-${e.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors">
                <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-[#282828]">
                  {cover
                    ? <img src={cover} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs">♫</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{e.username}</p>
                  <p className="text-xs text-[#a7a7a7] truncate">{e.title}</p>
                  {e.artist && <p className="text-xs text-[#727272] truncate">{e.artist}</p>}
                </div>
                <span className="text-[10px] text-[#727272] flex-shrink-0">{timeAgo(e.minutesAgo)}</span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
