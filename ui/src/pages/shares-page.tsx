import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Check, Copy, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import type { Share } from "@/lib/api/types"
import { shareLinkUrl } from "@/lib/share-url"
import { useResourceList } from "@/hooks/use-resource-list"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function SharesPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Share>("share", {
    sort: "created_at",
    order: "DESC",
    end: 200,
  })

  return (
    <div className="max-w-3xl space-y-4 py-6">
      <h1 className="text-2xl font-bold">{t("common.yourShares")}</h1>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-1">
          {data.data.map((share) => (
            <ShareRow key={share.id} share={share} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {t("shares.emptyMessage")}
        </p>
      )}
    </div>
  )
}

function ShareRow({ share }: { share: Share }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/share/${share.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share"] }),
  })

  async function copyLink() {
    await navigator.clipboard.writeText(shareLinkUrl(share.id))
    setCopied(true)
  }

  const expires = formatDate(share.expiresAt)

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {share.description || share.contents}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {share.contents} ·{" "}
          {t("shares.visitCount", { count: share.visitCount ?? 0 })}
          {expires ? ` · ${t("shares.expires", { date: expires })}` : ""}
        </p>
      </div>
      {share.downloadable && (
        <Badge variant="secondary">{t("shares.downloadable")}</Badge>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("shares.copyLink")}
        onClick={() => void copyLink()}
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("shares.delete", {
          name: share.description || share.contents,
        })}
        onClick={() => {
          if (confirm(t("shares.deleteConfirm"))) {
            deleteMutation.mutate()
          }
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
