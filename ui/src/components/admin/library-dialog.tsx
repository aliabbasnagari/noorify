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
})

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

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: library?.name ?? "",
      path: library?.path ?? "",
      defaultNewUsers: library?.defaultNewUsers ?? false,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Library>(
        isEditing ? `/api/library/${library.id}` : "/api/library",
        { method: isEditing ? "PUT" : "POST", body: values },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit library" : "New library"}</DialogTitle>
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
            {mutation.isError && (
              <p className="text-sm text-destructive">
                Couldn't save the library — check the name/path are unique
                and try again.
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
