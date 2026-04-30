// Hook para usar traduções em componentes
"use client";

import { translations, type TranslationKey } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

export function useTranslation() {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations.pt[key] || key;
  };

  return { t, locale, setLocale };
}
