import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { apiFetch, getOne } from "@/lib/api/http"
import type { Playlist } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SmartPlaylistRuleEditor } from "@/components/smart-playlist/rule-editor"
import { FIELDS } from "@/lib/smart-playlist/fields"
import {
  criteriaToWire,
  emptyGroup,
  wireToCriteria,
  type RuleGroup,
} from "@/lib/smart-playlist/criteria"

export default function SmartPlaylistEditorPage({ playlistId }: { playlistId?: string }) {
  const { t } = useTranslation()
  const SORT_OPTIONS = [
    { key: "random", label: t("smartPlaylist.random") },
    ...FIELDS,
  ]
  const navigate = useNavigate()
  const isEditing = !!playlistId

  const { data: existing, isLoading } = useQuery({
    queryKey: ["playlist", "detail", playlistId],
    queryFn: () => getOne<Playlist>("playlist", playlistId!),
    enabled: isEditing,
  })

  const [name, setName] = useState("")
  const [comment, setComment] = useState("")
  const [root, setRoot] = useState<RuleGroup>(emptyGroup("all"))
  const [sort, setSort] = useState("")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [limit, setLimit] = useState<number | "">("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Seed form state once the existing playlist loads — guarded on id so it
  // only runs once per playlist, not on every render (same "resync during
  // render, not in an effect" shape used elsewhere in this codebase).
  const [seededId, setSeededId] = useState<string | null>(null)
  if (existing && seededId !== existing.id) {
    setSeededId(existing.id)
    setName(existing.name)
    setComment(existing.comment ?? "")
    if (existing.rules) {
      const criteria = wireToCriteria(existing.rules as Record<string, unknown>)
      setRoot(criteria.root)
      setSort(criteria.sort ?? "")
      setOrder(criteria.order ?? "asc")
      setLimit(criteria.limit ?? "")
    }
  }

  async function handleSave() {
    setSaveError(null)
    if (!name.trim()) {
      setSaveError(t("smartPlaylist.nameRequired"))
      return
    }
    setSaving(true)
    try {
      const rules = criteriaToWire({
        root,
        sort: sort || undefined,
        order,
        limit: limit === "" ? undefined : limit,
      })
      const body = isEditing
        ? { ...existing, name, comment, rules }
        : { name, comment, public: false, rules }
      const saved = await apiFetch<Playlist>(
        isEditing ? `/api/playlist/${playlistId}` : "/api/playlist",
        { method: isEditing ? "PUT" : "POST", body },
      )
      navigate({ to: "/playlist/$playlistId", params: { playlistId: saved.id } })
    } catch {
      setSaveError(t("smartPlaylist.saveError"))
    } finally {
      setSaving(false)
    }
  }

  if (isEditing && isLoading) {
    return <p className="py-16 text-muted-foreground">{t("smartPlaylist.loading")}</p>
  }

  return (
    <div className="max-w-3xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">
        {isEditing
          ? t("smartPlaylist.editSmartPlaylistRules")
          : t("smartPlaylist.newSmartPlaylist")}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sp-name">{t("smartPlaylist.name")}</Label>
          <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-comment">{t("smartPlaylist.description")}</Label>
          <Input id="sp-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("smartPlaylist.rules")}</Label>
        <SmartPlaylistRuleEditor root={root} onChange={setRoot} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("smartPlaylist.sortBy")}</Label>
          <Select value={sort || "__none"} onValueChange={(v) => v && setSort(v === "__none" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t("smartPlaylist.defaultOrder")}</SelectItem>
              {SORT_OPTIONS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("smartPlaylist.direction")}</Label>
          <Select value={order} onValueChange={(v) => v && setOrder(v as "asc" | "desc")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t("smartPlaylist.ascending")}</SelectItem>
              <SelectItem value="desc">{t("smartPlaylist.descending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-limit">{t("smartPlaylist.limitNoLimit")}</Label>
          <Input
            id="sp-limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </div>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("smartPlaylist.savingEllipsis") : t("smartPlaylist.save")}
        </Button>
      </div>
    </div>
  )
}
