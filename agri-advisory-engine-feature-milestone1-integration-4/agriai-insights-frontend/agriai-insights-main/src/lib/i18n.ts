import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import hi from "@/locales/hi/common.json";
import kn from "@/locales/kn/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", flag: "🇮🇳" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const LANGUAGE_STORAGE_KEY = "kisan.language";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

const resources = {
  en: { common: en },
  hi: { common: hi },
  kn: { common: kn },
} as const;

/**
 * Single i18next instance shared by SSR and the browser.
 * Always starts on DEFAULT_LANGUAGE so server and client markup match;
 * LanguageProvider switches to the stored language after hydration.
 */
export function getI18n(): I18nInstance {
  if (!i18next.isInitialized) {
    i18next.use(initReactI18next).init({
      resources,
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
      defaultNS: "common",
      ns: ["common"],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  }

  return i18next;
}

// Initialize immediately so react-i18next context receives it on import
export const i18n = getI18n();
export default i18n;