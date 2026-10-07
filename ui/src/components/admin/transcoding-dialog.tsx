import { useState, type ReactElement } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/http"
import type { Transcoding } from "@/lib/api/types"
import { TRANSCODING_BITRATE_CHOICES } from "@/lib/bitrate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  name: z.string().min(1, "Name is required"),
  targetFormat: z.string().min(1, "Target format is required"),
  defaultBitRate: z.number(),
  command: z.string().min(1, "Command is required"),
})

/** Handles both create and edit — pass `transcoding` to edit an existing
 * profile. Only ever rendered when `config.enableTranscodingConfig` is
 * true (the caller checks) — the server doesn't even register the write
 * routes otherwise. */
export function TranscodingDialog({
  transcoding,
  trigger,
}: {
  transcoding?: Transcoding
  trigger: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEditing = !!transcoding

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: transcoding?.name ?? "",
      targetFormat: transcoding?.targetFormat ?? "",
      defaultBitRate: transcoding?.defaultBitRate ?? 192,
      command: transcoding?.command ?? "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Transcoding>(
        isEditing ? `/api/transcoding/${transcoding.id}` : "/api/transcoding",
        { method: isEditing ? "PUT" : "POST", body: values },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transcoding"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit transcoding profile" : "New transcoding profile"}
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target format</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mp3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultBitRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default bit rate</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => v && field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRANSCODING_BITRATE_CHOICES.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate === 0 ? "No default bit rate" : `${rate} kbps`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="command"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      {...field}
                      className="font-mono text-xs"
                    />
                  </FormControl>
                  {!isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Substitutions: %s: File path, %b: BitRate (in kbps)
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {mutation.isError && (
              <p className="text-sm text-destructive">
                Couldn't save the transcoding profile — try again.
              </p>
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
