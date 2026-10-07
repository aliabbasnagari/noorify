import { useState, type ReactElement } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/http"
import type { AdminUser, Library } from "@/lib/api/types"
import { useAuthStore } from "@/stores/auth-store"
import { LibraryChecklist } from "@/components/admin/library-checklist"
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

function schema(
  isEditing: boolean,
  changingPassword: boolean,
  requireCurrent: boolean,
) {
  const settingPassword = changingPassword || !isEditing
  return z
    .object({
      userName: z.string().min(1, "Username is required"),
      name: z.string().min(1, "Name is required"),
      email: z.union([
        z.string().email("Must be a valid email"),
        z.literal(""),
      ]),
      isAdmin: z.boolean(),
      password: settingPassword
        ? z.string().min(1, "Password is required")
        : z.string().optional(),
      confirmPassword: z.string().optional(),
      currentPassword: requireCurrent
        ? z.string().min(1, "Current password is required")
        : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!settingPassword) return
      if (!data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please confirm the password",
          path: ["confirmPassword"],
        })
      } else if (data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ["confirmPassword"],
        })
      }
    })
}

function setUserLibraries(userId: string, libraryIds: number[]) {
  return apiFetch<Library[]>(`/api/user/${userId}/library`, {
    method: "PUT",
    body: { libraryIds },
  })
}

/** Handles both create and edit. Per-user library assignment is a separate
 * server endpoint (`PUT /api/user/{id}/library`, not part of the user
 * record itself) — creating/updating the user record and setting its
 * libraries are two sequential requests, not one. Admins are implicitly
 * assigned every library server-side, so the checklist only applies to
 * non-admins. */
export function UserDialog({
  user,
  trigger,
}: {
  user?: AdminUser
  trigger: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [libraryIds, setLibraryIds] = useState<number[]>([])
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.session)
  const isEditing = !!user
  const isEditingSelf = isEditing && user.id === session?.id

  // Seed the checklist from the user's current assignment once, when the
  // dialog is opened for an existing user — a dedicated fetch (not the list
  // response's own `libraries` field, which may not always be populated)
  // since this is the one place that needs to be certain.
  const { data: currentLibraries } = useQuery({
    queryKey: ["user", user?.id, "library"],
    queryFn: () => apiFetch<Library[]>(`/api/user/${user!.id}/library`),
    enabled: open && isEditing,
  })
  const [seededFor, setSeededFor] = useState<string | null>(null)
  if (currentLibraries && seededFor !== user?.id) {
    setSeededFor(user!.id)
    setLibraryIds(currentLibraries.map((l) => l.id))
  }

  const form = useForm<z.infer<ReturnType<typeof schema>>>({
    resolver: zodResolver(
      schema(isEditing, changingPassword, changingPassword && isEditingSelf),
    ),
    values: {
      userName: user?.userName ?? "",
      name: user?.name ?? "",
      email: user?.email ?? "",
      isAdmin: user?.isAdmin ?? false,
      password: "",
      confirmPassword: "",
      currentPassword: "",
    },
  })

  const isAdminValue = form.watch("isAdmin")

  const mutation = useMutation({
    mutationFn: async (values: z.infer<ReturnType<typeof schema>>) => {
      const body: Record<string, unknown> = {
        userName: values.userName,
        name: values.name,
        email: values.email,
        isAdmin: values.isAdmin,
      }
      if (!isEditing || changingPassword) {
        body.password = values.password
        if (changingPassword && isEditingSelf) {
          body.currentPassword = values.currentPassword
        }
      }
      const saved = isEditing
        ? await apiFetch<AdminUser>(`/api/user/${user.id}`, {
            method: "PUT",
            body: { ...user, ...body },
          })
        : await apiFetch<AdminUser>("/api/user", { method: "POST", body })

      if (!values.isAdmin) {
        await setUserLibraries(saved.id, libraryIds)
      }
      return saved
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] })
      handleOpenChange(false)
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setChangingPassword(false)
      setLibraryIds([])
      setSeededFor(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit user" : "New user"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && !changingPassword ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangingPassword(true)}
              >
                Change password
              </Button>
            ) : (
              <>
                {isEditingSelf && (
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isEditing ? "New password" : "Password"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <FormLabel className="!mt-0">Admin</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isAdminValue ? (
              <p className="text-xs text-muted-foreground">
                Admins have access to every library automatically.
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Libraries</p>
                <LibraryChecklist
                  selectedIds={libraryIds}
                  onChange={setLibraryIds}
                />
              </div>
            )}

            {mutation.isError && (
              <p className="text-sm text-destructive">
                Couldn't save the user — check the username is unique and try
                again.
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
