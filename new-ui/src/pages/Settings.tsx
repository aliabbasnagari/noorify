import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Users, Server, Radio, Puzzle, FileX, Scan, Trash2, Plus, Pencil, Check, X, RefreshCw, Link2, Link2Off, BookMarked } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useAuth } from '@/contexts/AuthContext'
import { usePlayer, type ReplayGainMode } from '@/contexts/PlayerContext'
import { useToast } from '@/contexts/ToastContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { useI18n } from '@/contexts/I18nContext'
import { useFetch } from '@/hooks/useFetch'
import {
  getUsers, createUser, updateUser, deleteUser,
  getTranscodings, createTranscoding, updateTranscoding, deleteTranscoding,
  getLibraries, createLibrary, updateLibrary, deleteLibrary,
  getPlayers, updatePlayer, deletePlayer,
  getPlugins,
  getMissingFiles,
  getLastFMLinkStatus, unlinkLastFM, getLastFMCallbackUrl,
  getListenBrainzLinkStatus, unlinkListenBrainz, linkListenBrainz,
  updatePluginConfig,
  type NativeUser,
  type NativeTranscoding,
  type NativeLibrary,
  type NativePlayer,
  type NativePlugin,
  type NativeMissingFile,
  apiPut,
} from '@/lib/api'
import { getScanStatus, startScan, type ScanStatus } from '@/lib/subsonic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Personal Settings ─────────────────────────────────────────────────────────

function PersonalSettings() {
  const { replayGainMode, replayGainPreamp, setReplayGainMode, setReplayGainPreamp } = usePlayer()
  const { lastFMEnabled, listenBrainzEnabled } = useServerConfig()
  const { user: authUser } = useAuth()
  const { locale, setLocale, languages } = useI18n()
  const toast = useToast()
  const [notifications, setNotifications] = useState(() => localStorage.getItem('nd:notifications') === 'true')

  // Last.fm state
  const [lfmLinked, setLfmLinked] = useState<boolean | null>(null)
  const [lfmApiKey, setLfmApiKey] = useState<string | null>(null)
  const [lfmLinking, setLfmLinking] = useState(false)

  // ListenBrainz state
  const [lbLinked, setLbLinked] = useState<boolean | null>(null)
  const [lbTokenInput, setLbTokenInput] = useState('')
  const [lbDialogOpen, setLbDialogOpen] = useState(false)
  const [lbSaving, setLbSaving] = useState(false)

  useEffect(() => {
    if (lastFMEnabled) {
      getLastFMLinkStatus().then((s) => { setLfmLinked(s.status); setLfmApiKey(s.apiKey ?? null) }).catch(() => setLfmLinked(false))
    }
    if (listenBrainzEnabled) {
      getListenBrainzLinkStatus().then((s) => setLbLinked(s.status)).catch(() => setLbLinked(false))
    }
  }, [lastFMEnabled, listenBrainzEnabled])

  const handleLfmToggle = async () => {
    if (lfmLinked) {
      try { await unlinkLastFM(); setLfmLinked(false); toast.success('Last.fm unlinked') }
      catch { toast.error('Failed to unlink Last.fm') }
    } else if (lfmApiKey && authUser) {
      setLfmLinking(true)
      const cbUrl = getLastFMCallbackUrl(authUser.id)
      window.open(`https://www.last.fm/api/auth/?api_key=${lfmApiKey}&cb=${encodeURIComponent(cbUrl)}`, '_blank')
      // Poll for link status
      const poll = setInterval(async () => {
        try {
          const s = await getLastFMLinkStatus()
          if (s.status) { setLfmLinked(true); setLfmLinking(false); clearInterval(poll); toast.success('Last.fm linked!') }
        } catch { clearInterval(poll); setLfmLinking(false) }
      }, 2000)
      setTimeout(() => { clearInterval(poll); setLfmLinking(false) }, 60000)
    }
  }

  const handleLbSave = async () => {
    if (!lbTokenInput.trim()) return
    setLbSaving(true)
    try { await linkListenBrainz(lbTokenInput.trim()); setLbLinked(true); setLbDialogOpen(false); setLbTokenInput(''); toast.success('ListenBrainz linked!') }
    catch { toast.error('Invalid token or failed to link') } finally { setLbSaving(false) }
  }

  const handleLbUnlink = async () => {
    try { await unlinkListenBrainz(); setLbLinked(false); toast.success('ListenBrainz unlinked') }
    catch { toast.error('Failed to unlink ListenBrainz') }
  }

  const handleNotifications = (v: boolean) => {
    setNotifications(v)
    localStorage.setItem('nd:notifications', String(v))
    if (v && 'Notification' in window) {
      Notification.requestPermission()
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Personal Settings</h2>

      <div className="bg-[#282828] rounded-xl p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Language</h3>
          <p className="text-xs text-[#a7a7a7] mb-3">Select your preferred interface language.</p>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="w-48 bg-[#3e3e3e] border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#282828] border-white/10 text-white">
              {languages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id} className="hover:bg-white/10">{lang.name}</SelectItem>
              ))}
              {languages.length === 0 && (
                <SelectItem value="en" className="hover:bg-white/10">English</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-white/10 pt-5">
          <h3 className="text-sm font-semibold text-white mb-1">ReplayGain</h3>
          <p className="text-xs text-[#a7a7a7] mb-3">Normalize audio volume to prevent sudden changes between songs.</p>
          <Select value={replayGainMode} onValueChange={(v) => setReplayGainMode(v as ReplayGainMode)}>
            <SelectTrigger className="w-48 bg-[#3e3e3e] border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#282828] border-white/10 text-white">
              <SelectItem value="none" className="hover:bg-white/10">Off</SelectItem>
              <SelectItem value="track" className="hover:bg-white/10">Track</SelectItem>
              <SelectItem value="album" className="hover:bg-white/10">Album</SelectItem>
            </SelectContent>
          </Select>
          {replayGainMode !== 'none' && (
            <div className="mt-3">
              <Label className="text-white text-sm">Pre-amp: {replayGainPreamp > 0 ? '+' : ''}{replayGainPreamp} dB</Label>
              <input
                type="range"
                min={-15}
                max={15}
                step={0.5}
                value={replayGainPreamp}
                onChange={(e) => setReplayGainPreamp(Number(e.target.value))}
                className="w-48 h-1 mt-2 rounded-full bg-white/20 accent-[#1db954] cursor-pointer block"
              />
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Desktop Notifications</h3>
              <p className="text-xs text-[#a7a7a7] mt-0.5">Show a notification when the track changes.</p>
            </div>
            <Switch checked={notifications} onCheckedChange={handleNotifications} />
          </div>
        </div>
      </div>

      {/* Scrobbling */}
      {(lastFMEnabled || listenBrainzEnabled) && (
        <div className="bg-[#282828] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Scrobbling</h3>

          {lastFMEnabled && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Last.fm</p>
                <p className="text-xs text-[#a7a7a7] mt-0.5">
                  {lfmLinked ? 'Account linked — scrobbling active' : lfmApiKey ? 'Click to link your Last.fm account' : 'Last.fm not configured on server'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lfmLinking && <span className="text-xs text-[#a7a7a7]">Waiting…</span>}
                <button
                  onClick={handleLfmToggle}
                  disabled={lfmLinked === null || !lfmApiKey || lfmLinking}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-40 ${lfmLinked ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#1db954] text-black hover:bg-[#1ed760]'}`}
                >
                  {lfmLinked ? <><Link2Off size={12} /> Unlink</> : <><Link2 size={12} /> Link</>}
                </button>
              </div>
            </div>
          )}

          {listenBrainzEnabled && (
            <div className={`flex items-center justify-between ${lastFMEnabled ? 'border-t border-white/10 pt-4' : ''}`}>
              <div>
                <p className="text-sm text-white">ListenBrainz</p>
                <p className="text-xs text-[#a7a7a7] mt-0.5">
                  {lbLinked ? 'Account linked — scrobbling active' : 'Enter your ListenBrainz user token'}
                </p>
              </div>
              <button
                onClick={lbLinked ? handleLbUnlink : () => setLbDialogOpen(true)}
                disabled={lbLinked === null}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-40 ${lbLinked ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#1db954] text-black hover:bg-[#1ed760]'}`}
              >
                {lbLinked ? <><Link2Off size={12} /> Unlink</> : <><Link2 size={12} /> Link</>}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#282828] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Keyboard Shortcuts</h3>
        <div className="space-y-2 mt-3 text-sm">
          {[
            ['Space', 'Play / Pause'],
            ['Alt + →', 'Next track'],
            ['Alt + ←', 'Previous track'],
            ['M', 'Toggle mute'],
            ['Alt + S', 'Toggle shuffle'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[#a7a7a7]">{desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#3e3e3e] text-white text-xs font-mono">{key}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* ListenBrainz token dialog */}
      <Dialog open={lbDialogOpen} onOpenChange={(v) => { if (!v) { setLbDialogOpen(false); setLbTokenInput('') } }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Link ListenBrainz</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <Label className="text-white text-sm">User Token</Label>
            <Input
              value={lbTokenInput}
              onChange={(e) => setLbTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !lbSaving && lbTokenInput.trim() && handleLbSave()}
              placeholder="Paste your ListenBrainz token…"
              className="bg-[#3e3e3e] border-white/20 text-white font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-[#a7a7a7]">
              Find your token at{' '}
              <a href="https://listenbrainz.org/profile/" target="_blank" rel="noopener noreferrer" className="text-[#1db954] hover:underline">
                listenbrainz.org/profile
              </a>
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setLbDialogOpen(false); setLbTokenInput('') }} className="text-[#a7a7a7]">Cancel</Button>
            <Button onClick={handleLbSave} disabled={lbSaving || !lbTokenInput.trim()} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold">
              {lbSaving ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── User Management ───────────────────────────────────────────────────────────

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user?: NativeUser
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const { data: allLibraries } = useFetch(getLibraries, [])
  const [form, setForm] = useState({
    userName: user?.userName ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    isAdmin: user?.isAdmin ?? false,
  })
  const [libraryIds, setLibraryIds] = useState<number[]>(user?.libraryIds ?? [])
  const [saving, setSaving] = useState(false)

  const toggleLibrary = (id: number) => {
    setLibraryIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (!form.userName || (!user && !form.password)) return
    setSaving(true)
    try {
      const payload: Partial<NativeUser> & { changePassword?: boolean } = {
        ...form,
        libraryIds,
        ...(form.password ? { changePassword: true } : {}),
      }
      if (user) {
        await updateUser(user.id, payload)
        toast.success('User updated')
      } else {
        await createUser(payload)
        toast.success('User created')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label className="text-white">Username *</Label>
            <Input value={form.userName} onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))} disabled={!!user} className="bg-[#3e3e3e] border-white/20 text-white" /></div>
          <div className="space-y-1"><Label className="text-white">Display Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-[#3e3e3e] border-white/20 text-white" /></div>
          <div className="space-y-1"><Label className="text-white">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-[#3e3e3e] border-white/20 text-white" /></div>
          <div className="space-y-1"><Label className="text-white">{user ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="bg-[#3e3e3e] border-white/20 text-white" /></div>
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.isAdmin} onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: v }))} id="isAdmin" />
            <Label htmlFor="isAdmin" className="text-white cursor-pointer">Admin</Label>
          </div>
          {(allLibraries ?? []).length > 1 && (
            <div className="space-y-2 pt-1">
              <Label className="text-white text-sm">Library Access</Label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(allLibraries ?? []).map((lib) => (
                  <label key={lib.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={libraryIds.includes(lib.id) || libraryIds.length === 0}
                      onChange={() => toggleLibrary(lib.id)}
                      className="accent-[#1db954]"
                    />
                    <span className="text-sm text-[#a7a7a7] group-hover:text-white transition-colors">{lib.name}</span>
                  </label>
                ))}
              </div>
              {libraryIds.length === 0 && (
                <p className="text-xs text-[#a7a7a7]">Access to all libraries (default)</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-[#a7a7a7]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.userName || (!user && !form.password)} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UsersTab() {
  const toast = useToast()
  const { data: users, isLoading, refetch } = useFetch(getUsers, [])
  const [editUser, setEditUser] = useState<NativeUser | 'new' | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteUser(deleteId)
      toast.success('User deleted')
      refetch()
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">User Management</h2>
        <Button onClick={() => setEditUser('new')} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold text-sm h-8">
          <Plus size={14} className="mr-1" /> New User
        </Button>
      </div>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse border-b border-white/5 bg-[#282828]" />)
          : (users ?? []).map((u) => (
              <div key={u.id} className="group flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center flex-shrink-0">
                  <span className="text-black text-xs font-bold">{(u.name || u.userName).slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.name || u.userName}</p>
                  <p className="text-xs text-[#a7a7a7]">{u.userName}{u.isAdmin ? ' · Admin' : ''}{u.email ? ` · ${u.email}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
        }
      </div>
      {editUser && (
        <UserForm
          user={editUser === 'new' ? undefined : editUser}
          onClose={() => setEditUser(null)}
          onSaved={refetch}
        />
      )}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-[#a7a7a7] text-sm">This will permanently delete the user account.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#a7a7a7]">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Libraries Tab ─────────────────────────────────────────────────────────────

function LibraryForm({ lib, onClose, onSaved }: { lib?: NativeLibrary; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: lib?.name ?? '', path: lib?.path ?? '', defaultNewUsers: lib?.defaultNewUsers ?? false })
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try {
      if (lib) { await updateLibrary(lib.id, form); toast.success('Library updated') }
      else { await createLibrary(form); toast.success('Library created') }
      onSaved(); onClose()
    } catch { toast.error('Failed to save library') } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white">
        <DialogHeader><DialogTitle>{lib ? 'Edit Library' : 'Add Library'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label className="text-white">Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-[#3e3e3e] border-white/20 text-white" /></div>
          <div className="space-y-1"><Label className="text-white">Path</Label><Input value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} className="bg-[#3e3e3e] border-white/20 text-white" placeholder="/music/library" /></div>
          <div className="flex items-center gap-3"><Switch checked={form.defaultNewUsers} onCheckedChange={(v) => setForm((f) => ({ ...f, defaultNewUsers: v }))} id="dnu" /><Label htmlFor="dnu" className="text-white cursor-pointer">Default for new users</Label></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-[#a7a7a7]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.path} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold">{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LibrariesTab() {
  const toast = useToast()
  const { data: libs, isLoading, refetch } = useFetch(getLibraries, [])
  const [editLib, setEditLib] = useState<NativeLibrary | 'new' | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null)
  const [scanning, setScanning] = useState(false)

  const handleScan = async () => {
    setScanning(true)
    try {
      const status = await startScan()
      setScanStatus(status)
      toast.success('Scan started')
    } catch { toast.error('Failed to start scan') } finally { setScanning(false) }
  }

  useEffect(() => {
    getScanStatus().then(setScanStatus).catch(() => {})
    const interval = setInterval(() => getScanStatus().then((s) => { setScanStatus(s); if (!s.scanning) clearInterval(interval) }).catch(() => {}), 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Libraries</h2>
        <div className="flex gap-2">
          <Button onClick={handleScan} disabled={scanning || scanStatus?.scanning} variant="outline" className="border-white/20 text-white hover:bg-white/10 text-sm h-8">
            {scanStatus?.scanning ? <><RefreshCw size={14} className="mr-1 animate-spin" />Scanning ({scanStatus.count})</> : <><Scan size={14} className="mr-1" />Scan</>}
          </Button>
          <Button onClick={() => setEditLib('new')} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold text-sm h-8"><Plus size={14} className="mr-1" />Add</Button>
        </div>
      </div>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 animate-pulse border-b border-white/5" />) :
          (libs ?? []).map((lib) => (
            <div key={lib.id} className="group flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              <Server size={20} className="text-[#a7a7a7] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{lib.name}</p>
                <p className="text-xs text-[#a7a7a7] truncate">{lib.path}</p>
                <p className="text-xs text-[#a7a7a7]">{lib.totalSongs} songs · {lib.totalAlbums} albums{lib.totalMissingFiles ? ` · ${lib.totalMissingFiles} missing` : ''}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditLib(lib)} className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(lib.id)} className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        }
      </div>
      {editLib && <LibraryForm lib={editLib === 'new' ? undefined : editLib} onClose={() => setEditLib(null)} onSaved={refetch} />}
      <Dialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white">
          <DialogHeader><DialogTitle>Delete Library</DialogTitle></DialogHeader>
          <p className="text-[#a7a7a7] text-sm">This removes the library from Navidrome (files are not deleted).</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#a7a7a7]">Cancel</Button>
            <Button onClick={async () => { if (deleteId) { await deleteLibrary(deleteId); toast.success('Library removed'); refetch(); setDeleteId(null) } }} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Transcoding Tab ───────────────────────────────────────────────────────────

function TranscodingTab() {
  const { data: transcodings, isLoading } = useFetch(getTranscodings, [])
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Transcoding Profiles</h2>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse border-b border-white/5" />) :
          (transcodings ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-[#a7a7a7]">Format: {t.targetFormat} · Bitrate: {t.defaultBitRate}k</p>
                <p className="text-xs text-[#a7a7a7] truncate font-mono">{t.command}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Players Tab ───────────────────────────────────────────────────────────────

function PlayersTab() {
  const toast = useToast()
  const { data: players, isLoading, refetch } = useFetch(getPlayers, [])
  const handleDelete = async (id: string) => {
    try { await deletePlayer(id); toast.success('Player removed'); refetch() }
    catch { toast.error('Failed to remove player') }
  }
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Connected Players</h2>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse border-b border-white/5" />) :
          (players ?? []).length === 0 ? (
            <div className="text-center py-8 text-[#a7a7a7] text-sm">No connected players</div>
          ) :
          (players ?? []).map((p) => (
            <div key={p.id} className="group flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5">
              <Radio size={20} className="text-[#a7a7a7] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{p.name || p.client}</p>
                <p className="text-xs text-[#a7a7a7]">{p.client}{p.userName ? ` · ${p.userName}` : ''}{p.maxBitRate ? ` · max ${p.maxBitRate}k` : ''}</p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Plugins Tab ───────────────────────────────────────────────────────────────

function PluginsTab() {
  const toast = useToast()
  const { data: plugins, isLoading, refetch } = useFetch(getPlugins, [])
  const [editPlugin, setEditPlugin] = useState<NativePlugin | null>(null)
  const [configText, setConfigText] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const toggle = async (p: NativePlugin) => {
    try {
      await apiPut(`/plugin/${p.id}`, { enabled: !p.enabled })
      toast.success(p.enabled ? 'Plugin disabled' : 'Plugin enabled')
      refetch()
    } catch { toast.error('Failed to update plugin') }
  }

  const openConfig = (p: NativePlugin) => {
    setEditPlugin(p)
    // Try to pretty-print existing config
    let pretty = ''
    if (p.manifest) {
      try {
        const m = JSON.parse(p.manifest)
        if (m.config) {
          pretty = JSON.stringify(m.config, null, 2)
        }
      } catch {}
    }
    setConfigText(pretty || '{}')
    setConfigError(null)
  }

  const handleSaveConfig = async () => {
    if (!editPlugin) return
    // Validate JSON
    try { JSON.parse(configText) } catch (e: any) { setConfigError(`Invalid JSON: ${e.message}`); return }
    setConfigError(null)
    setSavingConfig(true)
    try {
      await updatePluginConfig(editPlugin.id, { config: configText })
      toast.success('Plugin config saved')
      refetch()
      setEditPlugin(null)
    } catch { toast.error('Failed to save plugin config') } finally { setSavingConfig(false) }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Plugins</h2>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse border-b border-white/5" />) :
          (plugins ?? []).length === 0 ? (
            <div className="text-center py-8 text-[#a7a7a7] text-sm">No plugins installed</div>
          ) :
          (plugins ?? []).map((p) => {
            let manifest: any = null
            try { manifest = p.manifest ? JSON.parse(p.manifest) : null } catch {}
            const hasConfig = !!(manifest?.configSchema || manifest?.config)
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0">
                <Puzzle size={20} className="text-[#a7a7a7] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{manifest?.name || p.name || p.id}</p>
                  <p className="text-xs text-[#a7a7a7]">{manifest?.description || ''}</p>
                  {p.lastError && <p className="text-xs text-red-400 truncate">{p.lastError}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {hasConfig && (
                    <button
                      onClick={() => openConfig(p)}
                      title="Edit config"
                      className="p-1.5 rounded hover:bg-white/10 text-[#a7a7a7] hover:text-white transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <Switch checked={p.enabled} onCheckedChange={() => toggle(p)} />
                </div>
              </div>
            )
          })
        }
      </div>

      {/* Plugin config editor dialog */}
      <Dialog open={!!editPlugin} onOpenChange={(v) => { if (!v) setEditPlugin(null) }}>
        <DialogContent className="bg-[#282828] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Plugin</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-white text-sm">Configuration (JSON)</Label>
            <textarea
              value={configText}
              onChange={(e) => { setConfigText(e.target.value); setConfigError(null) }}
              rows={12}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg p-3 text-sm font-mono text-white resize-y focus:outline-none focus:ring-1 focus:ring-[#1db954]"
              spellCheck={false}
            />
            {configError && <p className="text-xs text-red-400">{configError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPlugin(null)} className="text-[#a7a7a7]">Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold">
              {savingConfig ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Missing Files Tab ─────────────────────────────────────────────────────────

function MissingFilesTab() {
  const { data: files, isLoading, refetch } = useFetch(getMissingFiles, [])
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleDelete = async () => {
    if (!selected.size) return
    setDeleting(true)
    try {
      await Promise.all([...selected].map((id) => import('@/lib/api').then(({ apiDelete }) => apiDelete(`/missing/${id}`))))
      toast.success(`${selected.size} file(s) removed from database`)
      setSelected(new Set())
      refetch()
    } catch { toast.error('Failed to remove missing files') } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Missing Files</h2>
        {selected.size > 0 && (
          <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white text-sm h-8">
            <Trash2 size={14} className="mr-1" />Remove {selected.size} from DB
          </Button>
        )}
      </div>
      <div className="bg-[#282828] rounded-xl overflow-hidden">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse border-b border-white/5" />) :
          (files ?? []).length === 0 ? (
            <div className="text-center py-8 text-[#a7a7a7]">
              <FileX size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No missing files</p>
            </div>
          ) :
          (files ?? []).map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5">
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} className="accent-[#1db954]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-mono truncate">{f.path}</p>
                <p className="text-xs text-[#a7a7a7]">{f.libraryName ?? ''}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────

const PERSONAL_TABS = [{ id: 'personal', label: 'Personal', icon: SettingsIcon }]
const ADMIN_TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'libraries', label: 'Libraries', icon: Server },
  { id: 'transcoding', label: 'Transcoding', icon: Radio },
  { id: 'players', label: 'Players', icon: Radio },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'missing', label: 'Missing Files', icon: FileX },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [scrollY, setScrollY] = useState(0)

  const tabs = user?.isAdmin ? [...PERSONAL_TABS, ...ADMIN_TABS] : PERSONAL_TABS

  return (
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      <TopBar scrolled={scrollY > 20} />
      <div className="px-4 sm:px-6 pb-8">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        <div className="flex gap-6 flex-col sm:flex-row">
          {/* Sidebar nav */}
          <nav className="flex sm:flex-col gap-1 sm:w-44 flex-shrink-0 overflow-x-auto sm:overflow-visible">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-white/10 text-white'
                    : 'text-[#a7a7a7] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'personal' && <PersonalSettings />}
            {activeTab === 'users' && user?.isAdmin && <UsersTab />}
            {activeTab === 'libraries' && user?.isAdmin && <LibrariesTab />}
            {activeTab === 'transcoding' && user?.isAdmin && <TranscodingTab />}
            {activeTab === 'players' && user?.isAdmin && <PlayersTab />}
            {activeTab === 'plugins' && user?.isAdmin && <PluginsTab />}
            {activeTab === 'missing' && user?.isAdmin && <MissingFilesTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
