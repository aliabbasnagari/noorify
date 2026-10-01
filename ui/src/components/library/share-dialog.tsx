import { useState, type ReactElement } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Copy } from "lucide-react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "@/lib/api/http"
import type { Share } from "@/lib/api/types"
import { config } from "@/lib/config"
import { shareLinkUrl } from "@/lib/share-url"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const schema = z.object({
  description: z.string().optional(),
  downloadable: z.boolean(),
})

/** Creates a public, unauthenticated share link for one or more resources
 * of the same kind (all album ids, all song ids, etc. — the server rejects
 * mixed kinds). `resourceIds` are native REST ids as-is; the server infers
 * `resourceType` itself and ignores anything the client sends for it.
 *
 * `trigger` renders its own `DialogTrigger` (the common case: a visible
 * "Share" button). Omit it and pass `open`/`onOpenChange` instead when the
 * opener is somewhere a nested trigger can't live — e.g. a dropdown menu
 * item, where selecting the item already closes the menu and this dialog
 * needs to open independently of that. */
export function ShareDialog({
  resourceIds,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  resourceIds: string[]
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const [created, setCreated] = useState<Share | null>(null)
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      downloadable: config.enableDownloads && config.defaultDownloadableShare,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Share>("/api/share", {
        method: "POST",
        body: { resourceIds: resourceIds.join(","), ...values },
      }),
    onSuccess: (share) => {
      queryClient.invalidateQueries({ queryKey: ["share"] })
      setCreated(share)
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setCreated(null)
      setCopied(false)
      form.reset()
    }
  }

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(shareLinkUrl(id))
    setCopied(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("library.components.shareDialog.title")}</DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareLinkUrl(created.id)}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                size="icon"
                aria-label={t("library.components.shareDialog.copyLinkAria")}
                onClick={() => void copyLink(created.id)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {created.downloadable
                ? t("library.components.shareDialog.accessNoteListenDownload")
                : t("library.components.shareDialog.accessNoteListen")}
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("library.components.shareDialog.descriptionLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {config.enableDownloads && (
                <FormField
                  control={form.control}
                  name="downloadable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <FormLabel className="!mt-0">
                        {t("library.components.shareDialog.allowDownloading")}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              {mutation.isError && (
                <p className="text-sm text-destructive">
                  {t("library.components.shareDialog.createError")}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending
                    ? t("library.components.shareDialog.creating")
                    : t("library.components.shareDialog.createLink")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
