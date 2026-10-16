import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { AdminUser } from '@/lib/api/types'
import { logout, useAuthStore, type AuthSession } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

function accountSchema(t: (key: string) => string, changingPassword: boolean) {
  return z
    .object({
      name: z.string().min(1, t('personal.account.nameRequired')),
      email: z.union([
        z.string().email(t('personal.account.emailInvalid')),
        z.literal(''),
      ]),
      currentPassword: z.string().optional(),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!changingPassword) return
      const required = t('personal.account.passwordRequired')
      for (const field of ['currentPassword', 'password'] as const) {
        if (!data[field]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: required,
            path: [field],
          })
        }
      }
      if (data.password && data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.passwordMismatch'),
          path: ['confirmPassword'],
        })
      }
    })
}

type AccountValues = z.infer<ReturnType<typeof accountSchema>>

/** Edits the signed-in user's own name, email and password. The server only
 * lets non-admins do this while `EnableUserEditing` is on (the page hides the
 * section otherwise), and ignores any attempt to change their username or
 * admin flag, so neither is offered here. */
export function AccountSection({ session }: { session: AuthSession }) {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [changingPassword, setChangingPassword] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['user', session.id],
    queryFn: () => apiFetch<AdminUser>(`/api/user/${session.id}`),
  })

  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema(t, changingPassword)),
    values: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      currentPassword: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: AccountValues) => {
      const body: Record<string, unknown> = {
        ...user,
        name: values.name,
        email: values.email,
      }
      if (changingPassword) {
        body.password = values.password
        body.currentPassword = values.currentPassword
      }
      await apiFetch<AdminUser>(`/api/user/${session.id}`, {
        method: 'PUT',
        body,
      })
      if (!changingPassword) return null
      // The session's Subsonic token is derived from the old password, so
      // it stops working (streaming, cover art) the moment the password
      // changes. Signing in again with the new one issues a fresh session.
      try {
        return await apiFetch<AuthSession>('/auth/login', {
          method: 'POST',
          body: { username: session.username, password: values.password },
        })
      } catch {
        return 'relogin-failed' as const
      }
    },
    onSuccess: (fresh) => {
      void queryClient.invalidateQueries({ queryKey: ['user'] })
      if (fresh === 'relogin-failed') {
        // The password did change, so the current session is unusable;
        // the login form is the only way forward.
        toast.info(t('personal.account.passwordChangedSignIn'))
        if (!logout()) void router.navigate({ to: '/login' })
        return
      }
      const { setSession } = useAuthStore.getState()
      setSession(fresh ?? { ...session, name: form.getValues('name') })
      setChangingPassword(false)
      toast.success(
        t(
          changingPassword
            ? 'personal.account.passwordChanged'
            : 'personal.account.saved',
        ),
      )
    },
    onError: (error) => {
      const errors =
        error instanceof ApiError
          ? (error.body as { errors?: Record<string, string> } | null)?.errors
          : undefined
      if (errors?.currentPassword) {
        form.setError('currentPassword', {
          message: t('personal.account.wrongPassword'),
        })
      } else {
        toast.error(t('personal.account.saveFailed'))
      }
    },
  })

  function cancelPasswordChange() {
    setChangingPassword(false)
    form.reset()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4 py-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="personal-username">
              {t('personal.account.username')}
            </Label>
            <Input
              id="personal-username"
              value={session.username}
              readOnly
              disabled
            />
          </div>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('personal.account.name')}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('personal.account.email')}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} autoComplete="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {changingPassword ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t('personal.account.currentPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
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
                  <FormLabel>{t('personal.account.newPassword')}</FormLabel>
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
                  <FormLabel>{t('auth.confirmPasswordLabel')}</FormLabel>
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
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!user || mutation.isPending}>
            {mutation.isPending ? t('personal.saving') : t('personal.save')}
          </Button>
          {changingPassword ? (
            <Button
              type="button"
              variant="outline"
              onClick={cancelPasswordChange}
            >
              {t('personal.account.cancelPassword')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangingPassword(true)}
            >
              {t('personal.account.changePassword')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
