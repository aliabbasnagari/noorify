import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { apiFetch, apiUrl } from '@/lib/api/http'
import { SettingRow } from '@/components/personal/setting-row'
import { Switch } from '@/components/ui/switch'

interface LinkStatus {
  status: boolean
  apiKey?: string
  linkToken?: string
}

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 30

/** Links/unlinks the user's Last.fm account. Linking is a round trip through
 * last.fm's own auth page in a second tab; the server learns the result via a
 * callback, so this polls the link status until it flips (or the tab closes). */
export function LastfmSetting() {
  const { t } = useTranslation()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [apiKey, setApiKey] = useState<string | undefined>()
  const [checking, setChecking] = useState(false)
  const tab = useRef<Window | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<LinkStatus>('/api/lastfm/link')
      .then((res) => {
        if (cancelled) return
        setLinked(res.status === true)
        setApiKey(res.apiKey)
      })
      .catch(() => {
        if (!cancelled) setLinked(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!checking) return
    let polls = 0
    const finish = (success: boolean) => {
      setChecking(false)
      setLinked(success)
      if (success) toast.success(t('personal.lastfm.linkSuccess'))
      else toast.warning(t('personal.lastfm.linkFailure'))
    }
    const timer = window.setInterval(() => {
      apiFetch<LinkStatus>('/api/lastfm/link')
        .then((res) => {
          if (res.status === true) {
            window.clearInterval(timer)
            finish(true)
          } else if (tab.current?.closed || ++polls >= MAX_POLLS) {
            window.clearInterval(timer)
            finish(false)
          }
        })
        .catch(() => {
          window.clearInterval(timer)
          finish(false)
        })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [checking, t])

  function startLink() {
    // Open the tab synchronously so popup blockers attribute it to the click.
    const opened = window.open('about:blank', '_blank')
    if (!opened) {
      toast.warning(t('personal.lastfm.linkFailure'))
      return
    }
    tab.current = opened
    setChecking(true)
    apiFetch<LinkStatus>('/api/lastfm/link')
      .then((res) => {
        if (!res.linkToken) throw new Error('no link token')
        const callback = `${window.location.origin}${apiUrl(
          `/api/lastfm/link/callback?uid=${encodeURIComponent(res.linkToken)}`,
        )}`
        opened.location.href = `https://www.last.fm/api/auth/?api_key=${apiKey}&cb=${callback}`
      })
      .catch(() => {
        opened.close()
        setChecking(false)
        toast.warning(t('personal.lastfm.linkFailure'))
      })
  }

  function unlink() {
    apiFetch('/api/lastfm/link', { method: 'DELETE' })
      .then(() => {
        setLinked(false)
        toast.success(t('personal.lastfm.unlinkSuccess'))
      })
      .catch(() => toast.warning(t('personal.lastfm.unlinkFailure')))
  }

  return (
    <SettingRow
      label={t('personal.lastfm.label')}
      htmlFor="personal-lastfm"
      description={
        linked !== null && !apiKey
          ? t('personal.lastfm.notConfigured')
          : checking
            ? t('personal.lastfm.waiting')
            : undefined
      }
    >
      <Switch
        id="personal-lastfm"
        checked={linked === true || checking}
        disabled={!apiKey || linked === null || checking}
        onCheckedChange={(next) => (next ? startLink() : unlink())}
      />
    </SettingRow>
  )
}
