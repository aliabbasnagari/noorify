import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, CheckCircle2, AlertCircle, FolderOpen, Music2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useAuth } from '@/contexts/AuthContext'
import { apiGet, uploadMusic, type UploadResult } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Library {
  id: number
  name: string
  path: string
}

interface FileEntry {
  file: File
  status: 'pending' | 'done' | 'error' | 'skipped'
  result?: UploadResult
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [libraries, setLibraries] = useState<Library[]>([])
  const [libraryId, setLibraryId] = useState<string>('1')
  const [folder, setFolder] = useState('uploads')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Admin guard
  useEffect(() => {
    if (user && !user.isAdmin) navigate('/', { replace: true })
  }, [user, navigate])

  // Fetch library list
  useEffect(() => {
    apiGet<Library[]>('/library')
      .then((libs) => {
        setLibraries(libs)
        if (libs.length > 0) setLibraryId(String(libs[0].id))
      })
      .catch(() => {/* non-fatal, keep default */})
  }, [])

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(incoming).map((f) => ({
      file: f,
      status: 'pending',
    }))
    setFiles((prev) => {
      const existing = new Set(prev.map((e) => e.file.name + e.file.size))
      return [...prev, ...newEntries.filter((e) => !existing.has(e.file.name + e.file.size))]
    })
  }, [])

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleSubmit = async () => {
    const pending = files.filter((e) => e.status === 'pending')
    if (pending.length === 0) return
    setUploading(true)
    setError(null)

    try {
    const results = await uploadMusic(pending.map((e) => e.file), { libraryId: Number(libraryId), folder })

      // Map results back to file entries by filename
      const resultMap = new Map(results.map((r) => [r.filename, r]))

      setFiles((prev) =>
        prev.map((entry) => {
          if (entry.status !== 'pending') return entry
          const r = resultMap.get(entry.file.name)
          if (!r) return { ...entry, status: 'error' as const, result: { filename: entry.file.name, path: '', error: 'No response' } }
          return {
            ...entry,
            status: r.error ? 'error' as const : 'done' as const,
            result: r,
          }
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = files.filter((e) => e.status === 'pending').length
  const doneCount = files.filter((e) => e.status === 'done').length
  const errorCount = files.filter((e) => e.status === 'error').length

  if (!user?.isAdmin) return null

  return (
    <div className="h-full overflow-y-auto" onScroll={() => {}}>
      <div className="relative bg-gradient-to-b from-[#0d1f3c] via-[#121212]/70 to-[#121212] pb-4">
        <TopBar scrolled={false} bgColor="#0d1f3c" />
        <div className="px-4 sm:px-6 pt-4 pb-6">
          <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Admin</p>
          <h1 className="text-4xl font-black text-white leading-none">Upload Music</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-12 max-w-3xl space-y-6">

        {/* Settings row */}
        <div className="flex flex-wrap gap-4">
          {/* Library picker */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[#a7a7a7] uppercase tracking-wider text-xs font-semibold">Library</Label>
            <Select value={libraryId} onValueChange={setLibraryId} disabled={uploading}>
              <SelectTrigger className="bg-[#282828] border-white/10 text-white min-w-[180px] focus:ring-[#1db954]">
                <SelectValue placeholder="Select library" />
              </SelectTrigger>
              <SelectContent className="bg-[#282828] border-white/10">
                {libraries.length === 0 && <SelectItem value="1">Default (ID 1)</SelectItem>}
                {libraries.map((lib) => (
                  <SelectItem key={lib.id} value={String(lib.id)}>{lib.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination folder */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <Label className="text-[#a7a7a7] uppercase tracking-wider text-xs font-semibold">
              Destination folder
            </Label>
            <div className="flex items-center gap-2 bg-[#282828] border border-white/10 rounded-md px-3 focus-within:border-[#1db954] transition-colors">
              <FolderOpen size={15} className="text-[#a7a7a7] flex-shrink-0" />
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                disabled={uploading}
                placeholder="uploads"
                className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-[#6b6b6b] px-0 h-10"
              />
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors select-none',
            dragOver ? 'border-[#1db954] bg-[#1db954]/10' : 'border-white/20 bg-[#181818] hover:border-white/40',
            uploading && 'pointer-events-none opacity-50',
          )}
        >
          <Upload size={36} className={dragOver ? 'text-[#1db954]' : 'text-[#a7a7a7]'} />
          <p className="text-white font-semibold text-sm">
            {dragOver ? 'Drop files here' : 'Drag & drop audio files, or click to browse'}
          </p>
          <p className="text-xs text-[#a7a7a7]">MP3, FLAC, AAC, OGG, WAV, M4A… (max 500 MB each)</p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="rounded-xl bg-[#181818] border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#a7a7a7] font-semibold uppercase tracking-wider">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                {doneCount > 0 && <Badge variant="outline" className="border-[#1db954]/40 text-[#1db954] text-xs h-5">{doneCount} done</Badge>}
                {errorCount > 0 && <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs h-5">{errorCount} failed</Badge>}
              </div>
              {!uploading && (
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-[#a7a7a7] hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              <div className="divide-y divide-white/5">
                {files.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-shrink-0">
                      {entry.status === 'done' && <CheckCircle2 size={16} className="text-[#1db954]" />}
                      {entry.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                      {entry.status === 'pending' && (uploading
                        ? <Loader2 size={16} className="text-[#a7a7a7] animate-spin" />
                        : <Music2 size={16} className="text-[#a7a7a7]" />)}
                      {entry.status === 'skipped' && <AlertCircle size={16} className="text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{entry.file.name}</p>
                      {entry.result?.error && (
                        <p className="text-xs text-red-400 truncate">{entry.result.error}</p>
                      )}
                      {entry.result?.path && !entry.result.error && (
                        <p className="text-xs text-[#a7a7a7] truncate">{entry.result.path}</p>
                      )}
                      {entry.status === 'pending' && (
                        <p className="text-xs text-[#a7a7a7]">{formatBytes(entry.file.size)}</p>
                      )}
                    </div>
                    {entry.status === 'pending' && !uploading && (
                      <button
                        onClick={() => removeFile(idx)}
                        className="flex-shrink-0 text-[#a7a7a7] hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {uploading && (
              <div className="px-4 pb-3">
                <Progress
                  value={files.length > 0 ? ((doneCount + errorCount) / files.length) * 100 : 0}
                  className="h-1 bg-white/10 [&>div]:bg-[#1db954]"
                />
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/40 rounded-lg px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={pendingCount === 0 || uploading}
          className="w-fit px-8 h-11 rounded-full bg-[#1db954] text-black font-bold hover:bg-[#1ed760] transition-colors disabled:opacity-40"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin mr-2" />Uploading…</>
          ) : (
            `Upload ${pendingCount > 0 ? pendingCount : ''} file${pendingCount !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  )
}
