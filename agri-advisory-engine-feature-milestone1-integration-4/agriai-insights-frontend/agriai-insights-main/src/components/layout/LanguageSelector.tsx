import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLanguage } from "@/context/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { LanguageCode } from "@/lib/i18n";

/** Header dropdown that switches language instantly, without a page reload. */
export function LanguageSelector() {
  const { t } = useTranslation();
  const { language, languages, setLanguage } = useLanguage();
  const active = languages.find((entry) => entry.code === language) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          aria-label={t("a11y.languageSelector")}
          className="h-11 gap-2 rounded-full px-3 sm:px-4"
        >
          <Globe className="size-4" aria-hidden="true" />
          <span className="text-sm font-semibold">{active.nativeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("language.select")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onSelect={() => setLanguage(entry.code as LanguageCode)}
            className="min-h-11 cursor-pointer gap-3 text-base"
          >
            <span aria-hidden="true">{entry.flag}</span>
            <span className="flex-1">{entry.nativeLabel}</span>
            {entry.code === language ? (
              <Check className="size-4 text-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSelector;
