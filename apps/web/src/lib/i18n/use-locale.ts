import { useTranslation } from "react-i18next";

import type { Locale } from "./schema";

import { setStoredLocale } from "./schema";

export function useLocale() {
  const { i18n } = useTranslation();

  const locale = i18n.language as Locale;

  function setLocale(next: Locale) {
    void i18n.changeLanguage(next);
    setStoredLocale(next);
  }

  return { locale, setLocale };
}
