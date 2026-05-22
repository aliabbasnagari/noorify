import { useState } from 'react'
import { Radio as RadioIcon, Play, Pause, Pencil, Trash2, Plus, ExternalLink } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import {
  getInternetRadioStations,
  createInternetRadioStation,
  updateInternetRadioStation,
  deleteInternetRadioStation,
  type SubsonicRadioStation,
} from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function radioToSong(station: SubsonicRadioStation) {
  return {
    id: station.id,
    title: station.name,
    album: 'Internet Radio',
    albumId: '',
    artist: station.homePageUrl ?? '',
    artistId: '',
    duration: 0,
    size: 0,
    contentType: 'audio/mpeg',
    suffix: 'mp3',
    path: station.streamUrl,
    // Mark as radio for player
    isRadio: true,
    streamUrl: station.streamUrl,
  } as any
}

interface StationFormData {
  name: string
  streamUrl: string
  homePageUrl: string
}

function StationModal({
  open,
  onClose,
  station,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  station?: SubsonicRadioStation
  onSaved: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<StationFormData>({
    name: station?.name ?? '',
    streamUrl: station?.streamUrl ?? '',
    homePageUrl: station?.homePageUrl ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.streamUrl.trim()) return
    setSaving(true)
    try {
      if (station) {
        await updateInternetRadioStation(station.id, form.name, form.streamUrl, form.homePageUrl || undefined)
        toast.success('Station updated')
      } else {
        await createInternetRadioStation(form.name, form.streamUrl, form.homePageUrl || undefined)
        toast.success('Station created')
      }
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save station')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{station ? 'Edit Station' : 'Add Station'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-white">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-[#3e3e3e] border-white/20 text-white"
              placeholder="Station name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white">Stream URL *</Label>
            <Input
              value={form.streamUrl}
              onChange={(e) => setForm((f) => ({ ...f, streamUrl: e.target.value }))}
              className="bg-[#3e3e3e] border-white/20 text-white"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white">Home Page URL</Label>
            <Input
              value={form.homePageUrl}
              onChange={(e) => setForm((f) => ({ ...f, homePageUrl: e.target.value }))}
              className="bg-[#3e3e3e] border-white/20 text-white"
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-[#a7a7a7] hover:text-white">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.streamUrl.trim()}
            className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function RadioPage() {
  const { user } = useAuth()
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const toast = useToast()
  const [scrollY, setScrollY] = useState(0)
  const [editStation, setEditStation] = useState<SubsonicRadioStation | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: stations, isLoading, refetch } = useFetch(getInternetRadioStations, [])

  const handlePlay = (station: SubsonicRadioStation) => {
    const song = radioToSong(station)
    if (currentTrack?.id === station.id) {
      togglePlay()
    } else {
      playTrack(song)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteInternetRadioStation(deleteId)
      toast.success('Station deleted')
      refetch()
    } catch {
      toast.error('Failed to delete station')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      <div
        className="h-full overflow-y-auto"
        onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
      >
        <div className="relative bg-gradient-to-b from-[#1a3a5c] via-[#121212]/70 to-[#121212]">
          <TopBar scrolled={scrollY > 60} bgColor="#1a3a5c" />
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#1db954] flex items-center justify-center self-center sm:self-auto">
              <RadioIcon size={64} className="text-white" />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Browse</p>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">Internet Radio</h1>
              <div className="flex items-center gap-2 text-sm text-[#a7a7a7]">
                <span>{stations?.length ?? 0} stations</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
          {user?.isAdmin && (
            <button
              onClick={() => { setEditStation(undefined); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 text-white text-sm font-semibold hover:border-white transition-colors"
            >
              <Plus size={16} />
              Add Station
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 pb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded bg-[#282828]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#282828] rounded w-1/3" />
                  <div className="h-3 bg-[#282828] rounded w-1/4" />
                </div>
              </div>
            ))
          ) : (stations?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-[#a7a7a7]">
              <RadioIcon size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg font-semibold">No radio stations</p>
              {user?.isAdmin && <p className="text-sm mt-1">Add your first internet radio station.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-[16px_1fr_auto] gap-4 border-b border-white/10 pb-2 mb-2 px-4 text-xs uppercase tracking-widest text-[#a7a7a7]">
              <span />
              <span>Station</span>
              <span>Actions</span>
            </div>
          )}
          {(stations ?? []).map((station, idx) => {
            const isActive = currentTrack?.id === station.id
            const isThisPlaying = isActive && isPlaying
            return (
              <div
                key={station.id}
                className="group grid grid-cols-[16px_1fr_auto] gap-4 items-center px-4 py-3 rounded-md hover:bg-white/5 transition-colors"
              >
                <button
                  onClick={() => handlePlay(station)}
                  className="flex items-center justify-center text-[#a7a7a7] group-hover:text-white"
                >
                  {isThisPlaying ? (
                    <Pause size={14} fill="currentColor" className="text-[#1db954]" />
                  ) : (
                    <>
                      <span className="group-hover:hidden text-xs text-[#a7a7a7]">{idx + 1}</span>
                      <Play size={14} fill="currentColor" className="hidden group-hover:block" />
                    </>
                  )}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-[#1a3a5c] to-[#1db954] flex items-center justify-center flex-shrink-0">
                      <RadioIcon size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>
                        {station.name}
                      </p>
                      {station.homePageUrl && (
                        <a
                          href={station.homePageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#a7a7a7] hover:underline flex items-center gap-1 truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {station.homePageUrl}
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {user?.isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditStation(station); setShowModal(true) }}
                      className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(station.id)}
                      className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <StationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          station={editStation}
          onSaved={refetch}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Station</DialogTitle>
          </DialogHeader>
          <p className="text-[#a7a7a7] text-sm">Are you sure you want to delete this radio station?</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#a7a7a7]">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
