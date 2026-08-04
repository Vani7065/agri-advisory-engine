import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/i18n";

export interface LanguageContextType {
  language: LanguageCode;
  languages: typeof SUPPORTED_LANGUAGES;
  setLanguage: (code: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && isLanguageCode(saved)) {
      setLanguageState(saved);
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  const setLanguage = (code: LanguageCode) => {
    setLanguageState(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    i18n.changeLanguage(code);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        languages: SUPPORTED_LANGUAGES,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
