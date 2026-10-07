import { createRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Eye, EyeOff, Lock, Music2, User } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { rootRoute } from "@/routes/root"
import { apiFetch, ApiError } from "@/lib/api/http"
import { config, markSetupComplete } from "@/lib/config"
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
  // `config.firstTime` is baked into the page at load time. Capture it once
  // so this form keeps its mode for the whole visit, and clear the global
  // after the admin is created — otherwise a later logout (no reload) would
  // show the account-setup form again instead of the login form.
  const [firstTime] = useState(config.firstTime)
  const [showPassword, setShowPassword] = useState(false)
  const schema = loginSchema(t, firstTime)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const endpoint = firstTime ? "/auth/createAdmin" : "/auth/login"
      const session = await apiFetch<AuthSession>(endpoint, {
        method: "POST",
        body: { username: values.username, password: values.password },
      })
      if (firstTime) markSetupComplete()
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

  const passwordType = showPassword ? "text" : "password"

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_60%)]"
      />
      <div className="relative w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card/80 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Music2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">{t("app.name")}</h1>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {firstTime ? t("auth.setupTitle") : t("auth.welcomeBack")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {firstTime
                ? t("auth.setupSubtitle")
                : config.welcomeMessage || t("auth.signInSubtitle")}
            </p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.usernameLabel")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoComplete="username"
                        autoFocus
                        className="h-10 pl-9"
                        {...field}
                      />
                    </div>
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
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={passwordType}
                        autoComplete={
                          firstTime ? "new-password" : "current-password"
                        }
                        className="h-10 px-9"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? t("auth.hidePassword")
                            : t("auth.showPassword")
                        }
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {firstTime && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={passwordType}
                          autoComplete="new-password"
                          className="h-10 pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              size="lg"
              className="h-10 w-full rounded-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? firstTime
                  ? t("auth.creatingAdmin")
                  : t("auth.signingIn")
                : firstTime
                  ? t("auth.createAdmin")
                  : t("auth.signIn")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
