import { useState } from 'react'
import { Share2, Copy, Trash2, ExternalLink, Music, CheckCircle2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getShares, deleteShare, updateShare, type NativeShare } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
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
import { Switch } from '@/components/ui/switch'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

function EditShareModal({
  share,
  onClose,
  onSaved,
}: {
  share: NativeShare
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [description, setDescription] = useState(share.description ?? '')
  const [expires, setExpires] = useState(
    share.expiresAt ? new Date(share.expiresAt).toISOString().slice(0, 16) : '',
  )
  const [downloadable, setDownloadable] = useState(share.downloadable ?? false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateShare(share.id, {
        description: description || undefined,
        expiresAt: expires ? new Date(expires).toISOString() : undefined,
        downloadable,
      })
      toast.success('Share updated')
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to update share')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Edit Share</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-white">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#3e3e3e] border-white/20 text-white"
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white">Expires at</Label>
            <Input
              type="datetime-local"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="bg-[#3e3e3e] border-white/20 text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={downloadable}
              onCheckedChange={setDownloadable}
              id="downloadable"
            />
            <Label htmlFor="downloadable" className="text-white cursor-pointer">Allow download</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-[#a7a7a7] hover:text-white">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SharesPage() {
  const { user } = useAuth()
  const { enableSharing } = useServerConfig()
  const toast = useToast()
  const [scrollY, setScrollY] = useState(0)
  const [editShare, setEditShare] = useState<NativeShare | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: shares, isLoading, refetch } = useFetch(enableSharing ? getShares : null, [])

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
      toast.success('Link copied to clipboard')
    } catch {
      prompt('Copy this link:', url)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteShare(deleteId)
      toast.success('Share deleted')
      refetch()
    } catch {
      toast.error('Failed to delete share')
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
        <div className="relative bg-gradient-to-b from-[#5c1a4a] via-[#121212]/70 to-[#121212]">
          <TopBar scrolled={scrollY > 60} bgColor="#5c1a4a" />
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden bg-gradient-to-br from-[#5c1a4a] to-[#c13584] flex items-center justify-center self-center sm:self-auto">
              <Share2 size={64} className="text-white" />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Browse</p>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">Shared Links</h1>
              <div className="flex items-center gap-2 text-sm text-[#a7a7a7]">
                <span>{shares?.length ?? 0} shares</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-8 mt-4">
          {!enableSharing ? (
            <div className="text-center py-16 text-[#a7a7a7]">
              <Share2 size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg font-semibold">Sharing is disabled</p>
              <p className="text-sm mt-1">Enable sharing in Navidrome configuration (<code className="text-xs bg-white/10 px-1 rounded">ND_ENABLESHARING=true</code>).</p>
            </div>
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="w-10 h-10 rounded bg-[#282828]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#282828] rounded w-1/3" />
                  <div className="h-3 bg-[#282828] rounded w-1/4" />
                </div>
              </div>
            ))
          ) : (shares?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-[#a7a7a7]">
              <Share2 size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-lg font-semibold">No shared links</p>
              <p className="text-sm mt-1">Share songs or albums to create a public link.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(shares ?? []).map((share) => {
                const displayName = share.description || share.contents || share.tracks?.[0]?.title || share.id
                const shareUrl = `${window.location.origin}/share/${share.id}`
                return (
                  <div
                    key={share.id}
                    className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-[#5c1a4a] to-[#c13584] flex items-center justify-center flex-shrink-0">
                      <Music size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                      <div className="flex items-center gap-3 text-xs text-[#a7a7a7] mt-0.5 flex-wrap">
                        <span>{share.tracks?.length ?? 0} tracks</span>
                        <span>·</span>
                        <span>by {share.username}</span>
                        {share.expiresAt && (
                          <>
                            <span>·</span>
                            <span>expires {formatDate(share.expiresAt)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{share.visitCount} visits</span>
                        {share.downloadable && (
                          <>
                            <span>·</span>
                            <span className="text-[#1db954]">downloadable</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white transition-colors"
                        title="Open"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleCopy(shareUrl, share.id)}
                        className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white transition-colors"
                        title="Copy link"
                      >
                        {copied === share.id ? (
                          <CheckCircle2 size={14} className="text-[#1db954]" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      {(user?.isAdmin || share.username === user?.username) && (
                        <button
                          onClick={() => setDeleteId(share.id)}
                          className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {editShare && (
        <EditShareModal share={editShare} onClose={() => setEditShare(null)} onSaved={refetch} />
      )}

      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Share</DialogTitle>
          </DialogHeader>
          <p className="text-[#a7a7a7] text-sm">This will permanently remove the shared link.</p>
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
