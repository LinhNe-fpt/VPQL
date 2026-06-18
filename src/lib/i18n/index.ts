import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./locales/en";
import { ko } from "./locales/ko";
import { vi } from "./locales/vi";

export const LOCALE_KEY = "stockflow_locale";

export const locales = ["vi", "en", "ko"] as const;
export type AppLocale = (typeof locales)[number];

export const localeLabels: Record<AppLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  ko: "한국어",
};

export const localeIntl: Record<AppLocale, string> = {
  vi: "vi-VN",
  en: "en-US",
  ko: "ko-KR",
};

function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === "vi" || stored === "en" || stored === "ko") return stored;
  return null;
}

/** Khôi phục locale đã lưu — chỉ gọi sau mount (tránh hydration mismatch). */
export function restoreClientLocale() {
  if (typeof window === "undefined") return;
  const stored = readStoredLocale();
  if (stored && stored !== i18n.language) {
    void i18n.changeLanguage(stored);
  }
  document.documentElement.lang = getAppLocale();
}

export function isAppLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function setAppLocale(locale: AppLocale) {
  localStorage.setItem(LOCALE_KEY, locale);
  i18n.changeLanguage(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function getAppLocale(): AppLocale {
  const lng = i18n.language;
  if (isAppLocale(lng)) return lng;
  return "vi";
}

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    ko: { translation: ko },
  },
  lng: "vi",
  fallbackLng: "vi",
  interpolation: { escapeValue: false },
});

export default i18n;
