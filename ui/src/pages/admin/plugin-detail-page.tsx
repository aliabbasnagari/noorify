import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { getOne, apiFetch } from "@/lib/api/http"
import type { Plugin, PluginManifest } from "@/lib/api/types"
import { UserChecklist } from "@/components/admin/user-checklist"
import { LibraryChecklist } from "@/components/admin/library-checklist"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

function parseManifest(raw: string): PluginManifest | null {
  try {
    return JSON.parse(raw) as PluginManifest
  } catch {
    return null
  }
}

function parseIds<T extends string | number>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

/** No JSON-Schema-driven form generation (old-ui uses JSONForms) — a real,
 * disclosed scope trim for v1: config is edited as raw JSON text, validated
 * client-side before saving, rather than pulling in a schema-form renderer
 * dependency for what's an opt-in, relatively obscure admin feature. */
export default function PluginDetailPage({ pluginId }: { pluginId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: plugin, isLoading } = useQuery({
    queryKey: ["plugin", "detail", pluginId],
    queryFn: () => getOne<Plugin>("plugin", pluginId),
  })

  const [configText, setConfigText] = useState("")
  const [allUsers, setAllUsers] = useState(true)
  const [userIds, setUserIds] = useState<string[]>([])
  const [allLibraries, setAllLibraries] = useState(true)
  const [libraryIds, setLibraryIds] = useState<number[]>([])
  const [allowWriteAccess, setAllowWriteAccess] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [seededId, setSeededId] = useState<string | null>(null)

  if (plugin && seededId !== plugin.id) {
    setSeededId(plugin.id)
    setConfigText(plugin.config || "{}")
    setAllUsers(plugin.allUsers)
    setUserIds(parseIds<string>(plugin.users || "[]"))
    setAllLibraries(plugin.allLibraries)
    setLibraryIds(parseIds<number>(plugin.libraries || "[]"))
    setAllowWriteAccess(plugin.allowWriteAccess)
  }

  const manifest = plugin ? parseManifest(plugin.manifest) : null

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<Plugin>(`/api/plugin/${pluginId}`, { method: "PUT", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin"] })
    },
  })

  function handleSave() {
    setConfigError(null)
    const body: Record<string, unknown> = {}

    if (manifest?.config) {
      try {
        JSON.parse(configText)
      } catch {
        setConfigError("Config must be valid JSON.")
        return
      }
      body.config = configText
    }
    if (manifest?.permissions?.users) {
      body.allUsers = allUsers
      body.users = JSON.stringify(allUsers ? [] : userIds)
    }
    if (manifest?.permissions?.library) {
      body.allLibraries = allLibraries
      body.libraries = JSON.stringify(allLibraries ? [] : libraryIds)
      if (manifest.permissions.library.filesystem) {
        body.allowWriteAccess = allowWriteAccess
      }
    }
    mutation.mutate(body)
  }

  function handleToggleEnabled(enabled: boolean) {
    mutation.mutate({ enabled })
  }

  if (isLoading) return <p className="py-16 text-muted-foreground">Loading…</p>
  if (!plugin) return <p className="py-16 text-muted-foreground">Plugin not found.</p>

  return (
    <div className="max-w-2xl space-y-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{manifest?.name ?? plugin.id}</h1>
          <p className="text-sm text-muted-foreground">
            {manifest?.description} {manifest?.version && `· v${manifest.version}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin/plugins" })}>
          Back
        </Button>
      </div>

      {plugin.lastError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {plugin.lastError}
        </p>
      )}

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label className="!mt-0">Enabled</Label>
        <Switch checked={plugin.enabled} onCheckedChange={handleToggleEnabled} />
      </div>

      {manifest?.config && (
        <div className="space-y-1.5">
          <Label>Config (JSON)</Label>
          <Textarea
            rows={8}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            className="font-mono text-xs"
          />
          {configError && <p className="text-sm text-destructive">{configError}</p>}
        </div>
      )}

      {manifest?.permissions?.users && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="!mt-0">All users</Label>
            <Switch checked={allUsers} onCheckedChange={setAllUsers} />
          </div>
          {!allUsers && <UserChecklist selectedIds={userIds} onChange={setUserIds} />}
        </div>
      )}

      {manifest?.permissions?.library && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="!mt-0">All libraries</Label>
            <Switch checked={allLibraries} onCheckedChange={setAllLibraries} />
          </div>
          {!allLibraries && (
            <LibraryChecklist selectedIds={libraryIds} onChange={setLibraryIds} />
          )}
          {manifest.permissions.library.filesystem && (
            <div className="flex items-center justify-between pt-1">
              <Label className="!mt-0">Allow write access</Label>
              <Switch checked={allowWriteAccess} onCheckedChange={setAllowWriteAccess} />
            </div>
          )}
        </div>
      )}

      {mutation.isError && (
        <p className="text-sm text-destructive">Couldn't save — try again.</p>
      )}

      <Button onClick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save"}
      </Button>

      <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Raw manifest</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </details>
    </div>
  )
}
