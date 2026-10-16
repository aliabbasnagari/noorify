import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api/http'
import { SettingRow } from '@/components/personal/setting-row'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Links/unlinks ListenBrainz. Unlike Last.fm there's no browser round trip:
 * the user pastes their profile token and the server validates it. */
export function ListenBrainzSetting() {
  const { t } = useTranslation()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ status: boolean }>('/api/listenbrainz/link')
      .then((res) => {
        if (!cancelled) setLinked(res.status === true)
      })
      .catch(() => {
        if (!cancelled) setLinked(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function unlink() {
    apiFetch('/api/listenbrainz/link', { method: 'DELETE' })
      .then(() => {
        setLinked(false)
        toast.success(t('personal.listenbrainz.unlinkSuccess'))
      })
      .catch(() => toast.warning(t('personal.listenbrainz.unlinkFailure')))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await apiFetch<{ user: string }>('/api/listenbrainz/link', {
        method: 'PUT',
        body: { token: token.trim() },
      })
      setLinked(true)
      setToken('')
      setDialogOpen(false)
      toast.success(t('personal.listenbrainz.linkSuccess', { user: res.user }))
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? ((error.body as { error?: string } | null)?.error ?? error.message)
          : String(error)
      toast.warning(t('personal.listenbrainz.linkFailure', { error: detail }))
    } finally {
      setSaving(false)
    }
  }

  function handleOpenChange(open: boolean) {
    // Don't let the dialog close under an in-flight validation request.
    if (saving) return
    setDialogOpen(open)
    if (!open) setToken('')
  }

  return (
    <>
      <SettingRow
        label={t('personal.listenbrainz.label')}
        htmlFor="personal-listenbrainz"
      >
        <Switch
          id="personal-listenbrainz"
          checked={linked === true}
          disabled={linked === null}
          onCheckedChange={(next) => (next ? setDialogOpen(true) : unlink())}
        />
      </SettingRow>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (token.trim()) void save()
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{t('personal.listenbrainz.label')}</DialogTitle>
              <DialogDescription>
                {t('personal.listenbrainz.tokenHelp')}{' '}
                <a
                  href="https://listenbrainz.org/profile/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {t('personal.listenbrainz.getToken')}
                </a>
              </DialogDescription>
            </DialogHeader>
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t('personal.listenbrainz.tokenLabel')}
              aria-label={t('personal.listenbrainz.tokenLabel')}
              disabled={saving}
              autoFocus
              autoComplete="off"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleOpenChange(false)}
              >
                {t('personal.cancel')}
              </Button>
              <Button type="submit" disabled={saving || !token.trim()}>
                {saving ? t('personal.saving') : t('personal.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
