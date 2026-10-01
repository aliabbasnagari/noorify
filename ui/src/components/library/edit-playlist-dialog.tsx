import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"
import { apiFetch } from "@/lib/api/http"
import type { Playlist } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

function editPlaylistSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("library.components.editPlaylistDialog.nameRequired")),
    comment: z.string().optional(),
  })
}

export function EditPlaylistDialog({ playlist }: { playlist: Playlist }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const schema = editPlaylistSchema(t)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { name: playlist.name, comment: playlist.comment ?? "" },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch(`/api/playlist/${playlist.id}`, {
        method: "PUT",
        body: { ...playlist, ...values },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil className="size-3.5" />
        {t("library.components.editPlaylistDialog.trigger")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("library.components.editPlaylistDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("library.components.editPlaylistDialog.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(
                      "library.components.editPlaylistDialog.descriptionLabel",
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {t("library.components.editPlaylistDialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
