import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ListMusic, Plus } from "lucide-react"
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

function createPlaylistSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("library.components.createPlaylistDialog.nameRequired")),
    comment: z.string().optional(),
  })
}

export function CreatePlaylistDialog() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const schema = createPlaylistSchema(t)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", comment: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Playlist>("/api/playlist", {
        method: "POST",
        body: { ...values, public: false },
      }),
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: ["playlist"] })
      setDialogOpen(false)
      form.reset()
      navigate({ to: "/playlist/$playlistId", params: { playlistId: playlist.id } })
    },
  })

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger render={<Button size="sm" />}>
          <Plus className="size-3.5" />
          {t("library.components.createPlaylistDialog.trigger")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            {t("library.components.createPlaylistDialog.blankPlaylist")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate({ to: "/playlists/smart/new" })}
          >
            <ListMusic className="size-3.5" />
            {t("library.components.createPlaylistDialog.smartPlaylist")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("library.components.createPlaylistDialog.title")}
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
                      {t("library.components.createPlaylistDialog.nameLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
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
                        "library.components.createPlaylistDialog.descriptionLabel",
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
                  {t("library.components.createPlaylistDialog.create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
