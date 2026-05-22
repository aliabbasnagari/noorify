import { useState } from 'react'
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { createShare } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
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

interface ShareDialogProps {
  /** Comma-separated IDs (album ID, playlist ID, or song IDs) */
  resourceIds: string
  /** Display name shown in the dialog title */
  name: string
  open: boolean
  onClose: () => void
}

export function ShareDialog({ resourceIds, name, open, onClose }: ShareDialogProps) {
  const toast = useToast()
  const { enableSharing } = useServerConfig()
  const [description, setDescription] = useState('')
  const [downloadable, setDownloadable] = useState(false)
  const [expires, setExpires] = useState('')
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const share = await createShare({
        resourceIds,
        description: description.trim() || undefined,
        downloadable,
        expiresAt: expires ? new Date(expires).toISOString() : undefined,
      })
      const url = `${window.location.origin}/share/${share.id}`
      setShareUrl(url)
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied to clipboard')
    } catch {
      prompt('Copy this link:', shareUrl)
    }
  }

  const handleClose = () => {
    setDescription('')
    setDownloadable(false)
    setExpires('')
    setShareUrl(null)
    setCopied(false)
    onClose()
  }

  if (!enableSharing) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Share "{name}"
          </DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          /* ── Step 2: show the generated link ── */
          <div className="space-y-4 py-2">
            <p className="text-sm text-[#a7a7a7]">Your share link is ready. Anyone with this link can listen.</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="bg-[#3e3e3e] border-white/20 text-white text-xs"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCopy}
                className="flex-shrink-0 text-[#a7a7a7] hover:text-white hover:bg-white/10"
              >
                {copied ? <CheckCircle2 size={16} className="text-[#1db954]" /> : <Copy size={16} />}
              </Button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 rounded text-[#a7a7a7] hover:text-white hover:bg-white/10 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ) : (
          /* ── Step 1: configure share options ── */
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white">Description <span className="text-[#a7a7a7] font-normal">(optional)</span></Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#3e3e3e] border-white/20 text-white"
                placeholder="Add a note for the recipient…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Expires <span className="text-[#a7a7a7] font-normal">(optional)</span></Label>
              <Input
                type="datetime-local"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                className="bg-[#3e3e3e] border-white/20 text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="share-downloadable"
                checked={downloadable}
                onCheckedChange={setDownloadable}
              />
              <Label htmlFor="share-downloadable" className="text-white cursor-pointer">
                Allow download
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="text-[#a7a7a7] hover:text-white">
            {shareUrl ? 'Done' : 'Cancel'}
          </Button>
          {!shareUrl && (
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold"
            >
              {creating ? 'Creating…' : 'Create link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
