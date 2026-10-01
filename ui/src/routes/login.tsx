import { createRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { rootRoute } from "@/routes/root"
import { apiFetch, ApiError } from "@/lib/api/http"
import { config } from "@/lib/config"
import { useAuthStore, type AuthSession } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface LoginSearch {
  redirect?: string
}

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    // Only same-app paths: "//host" or "https://..." would be an open redirect.
    redirect:
      typeof search.redirect === "string" &&
      /^\/(?![/\\])/.test(search.redirect)
        ? search.redirect
        : undefined,
  }),
  component: LoginPage,
})

function loginSchema(t: (key: string) => string, firstTime: boolean) {
  // A single stable object shape (confirmPassword always optional) keeps
  // the inferred form type consistent regardless of `firstTime`, so the
  // JSX below doesn't need to deal with a union type — the cross-field
  // check is applied conditionally instead, since an ordinary login has
  // nothing to confirm against.
  return z
    .object({
      username: z.string().min(1, t("auth.usernameRequired")),
      password: z.string().min(1, t("auth.passwordRequired")),
      confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!firstTime) return
      if (!data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("auth.passwordRequired"),
          path: ["confirmPassword"],
        })
      } else if (data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("auth.passwordMismatch"),
          path: ["confirmPassword"],
        })
      }
    })
}

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = loginRoute.useSearch()
  const setSession = useAuthStore((s) => s.setSession)
  const schema = loginSchema(t, config.firstTime)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const endpoint = config.firstTime ? "/auth/createAdmin" : "/auth/login"
      const session = await apiFetch<AuthSession>(endpoint, {
        method: "POST",
        body: { username: values.username, password: values.password },
      })
      setSession(session)
      navigate({ to: search.redirect || "/" })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        toast.error(t("auth.invalidCredentials"))
      } else {
        toast.error(t("auth.networkError"))
      }
    }
  })

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">{t("app.name")}</h1>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.usernameLabel")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="username" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete={config.firstTime ? "new-password" : "current-password"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {config.firstTime && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? t("auth.signingIn")
                : config.firstTime
                  ? t("auth.createAdmin")
                  : t("auth.signIn")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
