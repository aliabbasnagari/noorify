import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Pencil, Play, Plus, Radio as RadioIcon, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Radio } from "@/lib/api/types"
import { useResourceList } from "@/hooks/use-resource-list"
import { Button } from "@/components/ui/button"
import { RadioDialog } from "@/components/library/radio-dialog"
import { radioToQueuedTrack, useCurrentTrack, usePlayerStore } from "@/stores/player-store"
import { useAuthStore } from "@/stores/auth-store"

export default function RadioPage() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore((s) => s.session?.isAdmin ?? false)
  const { data, isLoading } = useResourceList<Radio>("radio", {
    sort: "name",
    order: "ASC",
    end: 500,
  })

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("radio.title")}</h1>
        {isAdmin && (
          <RadioDialog
            trigger={
              <Button size="sm">
                <Plus className="size-3.5" />
                {t("radio.addStation")}
              </Button>
            }
          />
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : data && data.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.data.map((radio) => (
            <RadioCard key={radio.id} radio={radio} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {t("radio.emptyMessage")}
        </p>
      )}
    </div>
  )
}

function RadioCard({ radio, isAdmin }: { radio: Radio; isAdmin: boolean }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentTrack = useCurrentTrack()
  const queryClient = useQueryClient()
  const active = currentTrack?.id === radio.id && currentTrack.isRadio

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/radio/${radio.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["radio"] }),
  })

  return (
    <div className="group relative flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-accent">
      <button
        type="button"
        onClick={() => setQueue([radioToQueuedTrack(radio)], 0)}
        className="relative aspect-square overflow-hidden rounded bg-muted"
        aria-label={t("radio.play", { name: radio.name })}
      >
        {imgError ? (
          <RadioIcon className="absolute inset-0 m-auto size-8 text-muted-foreground" />
        ) : (
          <img
            src={getCoverArtUrl(radio.id, "ra", 300)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}
        <span className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <Play className="size-4 fill-current" />
        </span>
      </button>
      <div className="min-w-0">
        <p className={active ? "truncate text-sm font-medium text-primary" : "truncate text-sm font-medium"}>
          {radio.name}
        </p>
        {radio.homePageUrl && (
          <a
            href={radio.homePageUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-muted-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {radio.homePageUrl}
          </a>
        )}
      </div>
      {isAdmin && (
        <div className="flex gap-1">
          <RadioDialog
            radio={radio}
            trigger={
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={t("radio.edit", { name: radio.name })}
              >
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <Button
            variant="outline"
            size="icon-xs"
            aria-label={t("radio.delete", { name: radio.name })}
            onClick={() => {
              if (confirm(t("radio.deleteConfirm", { name: radio.name }))) {
                deleteMutation.mutate()
              }
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
