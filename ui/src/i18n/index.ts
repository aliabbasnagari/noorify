import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'
import fa from './locales/fa.json'
import ur from './locales/ur.json'

// Catalogs: English is complete (locales/en.json); `ar`, `fa` and `ur` cover
// most screens and fall back to English key-by-key for anything missing.
// Porting old-ui's other ~35 community translations is not planned — its
// resources.*.fields/actions catalog is react-admin/polyglot-style and
// doesn't map onto this app's key shapes, so each would be a fresh
// translation effort, not a mechanical conversion.
//
// Adding a language: import its catalog, add it to `resources`, and list it
// in LANGUAGES (with `rtl` if it reads right-to-left) so the Personal page
// offers it.
export const LANGUAGES = [
  { id: 'en', name: 'English', rtl: false },
  { id: 'ar', name: 'العربية', rtl: true },
  { id: 'fa', name: 'فارسی', rtl: true },
  { id: 'ur', name: 'اردو', rtl: true },
] as const

export type LanguageId = (typeof LANGUAGES)[number]['id']

function isLanguage(id: string | null): id is LanguageId {
  return LANGUAGES.some((language) => language.id === id)
}

function storedLanguage(): LanguageId {
  const stored = localStorage.getItem('locale')
  return isLanguage(stored) ? stored : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    fa: { translation: fa },
    ur: { translation: ur },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

/** Mirrors the language onto <html>: `lang` for screen readers/fonts, `dir`
 * so the browser lays text and flex/grid flow out right-to-left. */
function applyDocumentLanguage(id: LanguageId) {
  document.documentElement.lang = id
  document.documentElement.dir = LANGUAGES.find((l) => l.id === id)?.rtl
    ? 'rtl'
    : 'ltr'
}

applyDocumentLanguage(storedLanguage())

/** Switches the UI language and remembers it for the next load. */
export async function setLanguage(id: LanguageId) {
  await i18n.changeLanguage(id)
  localStorage.setItem('locale', id)
  applyDocumentLanguage(id)
}

export default i18n
