/**
 * I18nContext — lightweight i18n for new-ui
 *
 * - Bundles English as the fallback (`src/i18n/en.json`)
 * - Loads extra translations from the server's PUBLIC `/api/translation` API
 *   (same JSON files already used by the old UI — no auth required)
 * - Maps new-ui dot-notation keys to old-UI server keys where they overlap,
 *   so existing 30+ language translations work out of the box for common strings
 * - Provides `t(key, params?)` and `{ locale, setLocale, languages }`
 * - Locale preference persisted in localStorage under `nd:locale`
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import en from '@/i18n/en.json'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Language {
  id: string
  name: string
}

interface I18nContextValue {
  /** Translate a dot-notation key, with optional {{param}} interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string
  /** Current locale code, e.g. "en", "fr", "de" */
  locale: string
  /** Change locale and persist it */
  setLocale: (locale: string) => void
  /** Available languages fetched from the server */
  languages: Language[]
  /** True while the selected locale's translation data is being fetched */
  isLoading: boolean
}

// ─── Server-key mapping ────────────────────────────────────────────────────────
//
// Map new-ui dot-notation keys → equivalent keys in the old server translation
// JSON files.  When `t('action.playNext')` is called and a server translation is
// loaded, we also probe `resources.song.actions.playNext` in that bundle so the
// user's existing language translation "just works" for common strings.

const SERVER_KEY_MAP: Record<string, string> = {
  'auth.username':           'ra.auth.username',
  'auth.password':           'ra.auth.password',
  'auth.signIn':             'ra.auth.sign_in',
  'action.play':             'resources.album.actions.playAll',
  'action.shuffle':          'resources.album.actions.shuffle',
  'action.playNext':         'resources.song.actions.playNext',
  'action.addToQueue':       'resources.song.actions.addToQueue',
  'action.addToPlaylist':    'resources.song.actions.addToPlaylist',
  'action.download':         'ra.action.download',
  'action.share':            'ra.action.share',
  'action.copyLink':         'ra.action.share',
  'action.removeFromPlaylist': 'resources.song.actions.removeFromPlaylist',
  'common.cancel':           'ra.action.cancel',
  'common.save':             'ra.action.save',
  'common.delete':           'ra.action.delete',
  'common.edit':             'ra.action.edit',
  'common.close':            'ra.action.close',
  'player.shuffle':          'player.playModeText.shufflePlay',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a dot-notation key against a plain nested-object bundle. */
function getNestedValue(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** Replace `{{param}}` placeholders. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{{${key}}}`,
  )
}

/** Resolve locale from localStorage → navigator language → 'en'. */
function detectLocale(): string {
  const stored = localStorage.getItem('nd:locale')
  if (stored) return stored
  const nav = navigator.language.split('-')[0]
  return nav || 'en'
}

// ─── Context ───────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

// Convenience alias matching the react-i18next naming convention so pages can
// do:  const { t } = useTranslation()
export function useTranslation() {
  return useI18n()
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>(detectLocale)
  const [languages, setLanguages] = useState<Language[]>([{ id: 'en', name: 'English' }])
  const [serverBundle, setServerBundle] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const mountedRef = useRef(true)

  // Fetch available language list once (public endpoint, no auth required)
  useEffect(() => {
    fetch('/api/translation')
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => {
        if (!mountedRef.current) return
        const list: Language[] = [{ id: 'en', name: 'English' }]
        if (Array.isArray(data)) {
          data.forEach((l) => {
            if (l.id !== 'en') list.push({ id: l.id, name: l.name })
          })
        }
        list.sort((a, b) => a.name.localeCompare(b.name))
        setLanguages(list)
      })
      .catch(() => {/* leave default English-only list */})
    return () => { mountedRef.current = false }
  }, [])

  // Load translation whenever locale changes
  useEffect(() => {
    if (locale === 'en') {
      setServerBundle(null)
      return
    }

    setIsLoading(true)
    fetch(`/api/translation/${locale}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then((data: { data: string }) => {
        if (!mountedRef.current) return
        try {
          const parsed = JSON.parse(data.data) as Record<string, unknown>
          setServerBundle(parsed)
        } catch {
          setServerBundle(null)
        }
      })
      .catch(() => {
        if (mountedRef.current) setServerBundle(null)
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false)
      })
  }, [locale])

  const setLocale = useCallback((newLocale: string) => {
    localStorage.setItem('nd:locale', newLocale)
    document.documentElement.lang = newLocale
    setLocaleState(newLocale)
  }, [])

  // Set initial html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Try server bundle via the key map (old-UI translations)
      if (serverBundle) {
        const serverKey = SERVER_KEY_MAP[key]
        if (serverKey) {
          const serverValue = getNestedValue(serverBundle, serverKey)
          if (serverValue) return interpolate(serverValue, params)
        }
        // 2. Try server bundle with the same key directly (future: new-ui keys added to server files)
        const directValue = getNestedValue(serverBundle, key)
        if (directValue) return interpolate(directValue, params)
      }

      // 3. Fall back to bundled English
      const enValue = getNestedValue(en as Record<string, unknown>, key)
      if (enValue) return interpolate(enValue, params)

      // 4. Return the key itself as last resort
      return key
    },
    [serverBundle],
  )

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, languages, isLoading }}>
      {children}
    </I18nContext.Provider>
  )
}
