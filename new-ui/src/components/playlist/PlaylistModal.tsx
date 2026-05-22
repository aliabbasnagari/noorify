import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music2 } from 'lucide-react'
import { createPlaylist, updatePlaylist } from '@/lib/subsonic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PlaylistModalProps {
  open: boolean
  onClose: () => void
  /** 'create' = new playlist; 'rename' = edit existing */
  mode?: 'create' | 'rename'
  /** Required when mode === 'rename' */
  playlistId?: string
  /** Pre-fills the input when mode === 'rename' */
  currentName?: string
  /** Called after a successful create (before navigation) */
  onCreated?: () => void
  /** Called after a successful rename */
  onRenamed?: () => void
}

export function PlaylistModal({
  open,
  onClose,
  mode = 'create',
  playlistId,
  currentName = '',
  onCreated,
  onRenamed,
}: PlaylistModalProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(mode === 'rename' ? currentName : '')
      setError(null)
      setIsSaving(false)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open, mode, currentName])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a playlist name')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      if (mode === 'create') {
        const playlist = await createPlaylist(trimmed)
        onCreated?.()
        onClose()
        navigate(`/playlist/${playlist.id}`)
      } else {
        if (!playlistId) throw new Error('playlistId required for rename')
        await updatePlaylist(playlistId, { name: trimmed })
        onRenamed?.()
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSaving(false)
    }
  }

  const isCreate = mode === 'create'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#282828] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isCreate ? 'Create playlist' : 'Rename playlist'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 py-2">
          <div className="w-20 h-20 flex-shrink-0 rounded-md bg-[#3e3e3e] flex items-center justify-center">
            <Music2 size={28} className="text-[#a7a7a7]" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Input
              ref={inputRef}
              type="text"
              placeholder="My playlist"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              maxLength={100}
              className="bg-[#3e3e3e] border-transparent text-white placeholder:text-[#a7a7a7] focus-visible:border-white/30 focus-visible:ring-0"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-full border-white/20 text-white hover:bg-white/10 hover:border-white/60 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="rounded-full bg-[#1db954] text-black font-bold hover:bg-[#1ed760] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
