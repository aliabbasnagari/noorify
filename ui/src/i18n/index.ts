import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"

// English catalog covering every screen built through Phase 6 (see
// locales/en.json). Porting old-ui's ~40 community-translated languages is
// not planned — its resources.*.fields/actions catalog is react-admin/
// polyglot-style and doesn't map onto this app's key shapes, so it'd be a
// fresh translation effort per language, not a mechanical conversion.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: localStorage.getItem("locale") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

export default i18n
