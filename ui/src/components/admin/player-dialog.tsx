import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getList, apiFetch } from "@/lib/api/http"
import type { Player, Transcoding } from "@/lib/api/types"
import { BITRATE_CHOICES } from "@/lib/bitrate"
import { config } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"

const NONE = "__none"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  transcodingId: z.string(),
  maxBitRate: z.string(),
  reportRealPath: z.boolean(),
  scrobbleEnabled: z.boolean(),
})

/** Players self-register when a client connects — there's no create flow,
 * only editing an existing one (transcoding assignment, bitrate cap, flags)
 * or deleting a stale entry (that's a separate action on the list row). */
export function PlayerDialog({
  player,
  open,
  onOpenChange,
}: {
  player: Player
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const { data: transcodingOptions } = useQuery({
    queryKey: ["transcoding", "list", "for-player-dialog"],
    queryFn: () => getList<Transcoding>("transcoding", { sort: "name", order: "ASC", end: 200 }),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: player.name,
      transcodingId: player.transcodingId || NONE,
      maxBitRate: player.maxBitRate ? String(player.maxBitRate) : NONE,
      reportRealPath: player.reportRealPath,
      scrobbleEnabled: player.scrobbleEnabled,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Player>(`/api/player/${player.id}`, {
        method: "PUT",
        body: {
          ...player,
          name: values.name,
          transcodingId: values.transcodingId === NONE ? "" : values.transcodingId,
          maxBitRate: values.maxBitRate === NONE ? 0 : Number(values.maxBitRate),
          reportRealPath: values.reportRealPath,
          scrobbleEnabled: values.scrobbleEnabled,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player"] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase">Client</p>
                <p>{player.client || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase">User</p>
                <p>{player.userName}</p>
              </div>
            </div>
            <FormField
              control={form.control}
              name="transcodingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcoding</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {transcodingOptions?.data.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxBitRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max bit rate</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>No limit</SelectItem>
                      {BITRATE_CHOICES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate} kbps
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportRealPath"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="!mt-0">Report real path</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {(config.lastFMEnabled || config.listenBrainzEnabled) && (
              <FormField
                control={form.control}
                name="scrobbleEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <FormLabel className="!mt-0">Scrobbling enabled</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
