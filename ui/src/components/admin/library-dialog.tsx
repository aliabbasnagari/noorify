import { useState, type ReactElement } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/http"
import type { Library } from "@/lib/api/types"
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
import { config } from "@/lib/config"
import {
  PID_CUSTOM,
  PID_FOLDER,
  PID_GLOBAL,
  pidConfigChanged,
  pidModeFromValue,
  pidValueForMode,
  type PidField,
  type PidMode,
} from "@/lib/pid-presets"
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
  path: z.string().min(1, "Path is required"),
  defaultNewUsers: z.boolean(),
  pidAlbum: z.string(),
  pidTrack: z.string(),
})

type FormValues = z.infer<typeof schema>

const PID_DOCS_URL = "https://www.navidrome.org/docs/usage/pids/"

const PID_FIELDS: {
  name: PidField
  label: string
  allowFolder: boolean
}[] = [
  { name: "pidAlbum", label: "Album grouping", allowFolder: true },
  { name: "pidTrack", label: "Track identity", allowFolder: false },
]

const PID_MODE_LABELS: Record<PidMode, (globalValue: string) => string> = {
  [PID_GLOBAL]: (g) => `Use global setting (${g})`,
  [PID_FOLDER]: () => "Folder (one album per folder)",
  [PID_CUSTOM]: () => "Custom",
}

/** Handles both create and edit. Library id 1 is special server-side
 * (`model.DefaultLibraryID`): its path can never change after creation, so
 * the path field is disabled (not just validated) when editing it. */
export function LibraryDialog({
  library,
  trigger,
}: {
  library?: Library
  trigger: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEditing = !!library
  const pathLocked = library?.id === 1

  // Custom mode is local state so choosing it shows the text box before
  // anything is typed (an empty stored value means "use the global setting").
  const [pidModes, setPidModes] = useState<Record<PidField, PidMode>>(() => ({
    pidAlbum: pidModeFromValue(library?.pidAlbum, true),
    pidTrack: pidModeFromValue(library?.pidTrack, false),
  }))
  // A PID change regroups the library and starts a full rescan, so ask first.
  const [confirmingPid, setConfirmingPid] = useState(false)
  const globals: Record<PidField, string> = {
    pidAlbum: config.pidAlbum,
    pidTrack: config.pidTrack,
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: library?.name ?? "",
      path: library?.path ?? "",
      defaultNewUsers: library?.defaultNewUsers ?? false,
      pidAlbum: library?.pidAlbum ?? "",
      pidTrack: library?.pidTrack ?? "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiFetch<Library>(
        isEditing ? `/api/library/${library.id}` : "/api/library",
        { method: isEditing ? "PUT" : "POST", body: values },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] })
      setConfirmingPid(false)
      setOpen(false)
    },
    onError: () => setConfirmingPid(false),
  })

  // Every submit path (button and Enter key) goes through here.
  const submit = (values: FormValues) => {
    let valid = true
    for (const { name, label } of PID_FIELDS) {
      if (pidModes[name] === PID_CUSTOM && values[name].trim() === "") {
        form.setError(name, { message: `${label} spec is required` })
        valid = false
      }
    }
    if (!valid) return
    if (
      isEditing &&
      pidConfigChanged(values, library, globals)
    ) {
      setConfirmingPid(true)
      return
    }
    mutation.mutate(values)
  }

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) setConfirmingPid(false)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit library" : "New library"}</DialogTitle>
        </DialogHeader>
        {confirmingPid ? (
          <div className="space-y-4">
            <p className="font-medium">Change persistent IDs?</p>
            <p className="text-sm text-muted-foreground">
              This regroups albums and tracks in this library. A full rescan
              of this library starts now. Track stars, ratings and play
              counts are kept. Album stars and ratings move to the new albums
              where an old album maps to a new one.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingPid(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(form.getValues())}
              >
                {mutation.isPending ? "Saving…" : "Save and rescan"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
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
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pathLocked} />
                  </FormControl>
                  {pathLocked && (
                    <p className="text-xs text-muted-foreground">
                      The main library's path can't be changed.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultNewUsers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="!mt-0">
                    Assign to new users by default
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
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Persistent IDs</h3>
              {PID_FIELDS.map(({ name, label, allowFolder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <Select
                        value={pidModes[name]}
                        onValueChange={(v) => {
                          if (!v) return
                          const mode = v as PidMode
                          setPidModes((m) => ({ ...m, [name]: mode }))
                          field.onChange(pidValueForMode(mode, globals[name]))
                          form.clearErrors(name)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {PID_MODE_LABELS[pidModes[name]](globals[name])}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={PID_GLOBAL}>
                            {PID_MODE_LABELS[PID_GLOBAL](globals[name])}
                          </SelectItem>
                          {allowFolder && (
                            <SelectItem value={PID_FOLDER}>
                              {PID_MODE_LABELS[PID_FOLDER](globals[name])}
                            </SelectItem>
                          )}
                          <SelectItem value={PID_CUSTOM}>
                            {PID_MODE_LABELS[PID_CUSTOM](globals[name])}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {pidModes[name] === PID_CUSTOM && (
                        <>
                          <FormControl>
                            <Input
                              {...field}
                              aria-label={`${label} spec`}
                              placeholder="PID spec"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Tags and attributes that identify an item. See the
                            documentation for the syntax:{" "}
                            <a
                              href={PID_DOCS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Persistent IDs
                            </a>
                          </p>
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                Couldn't save the library — check the name/path are unique
                and any custom PID spec is valid, then try again.
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
