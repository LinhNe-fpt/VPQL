import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AppLocale,
  localeLabels,
  locales,
  setAppLocale,
} from "@/lib/i18n";

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export function LanguageSwitcher({ compact, className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] ?? "vi") as AppLocale;

  return (
    <Select
      value={locales.includes(current) ? current : "vi"}
      onValueChange={(value) => setAppLocale(value as AppLocale)}
    >
      <SelectTrigger
        className={[
          compact ? "h-9 w-[110px] gap-1.5" : "h-9 w-[140px] gap-2",
          "border-border/70 bg-card/80 text-[12px] font-medium",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={t("common.language")}
      >
        <Languages className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale} className="text-[13px]">
            {localeLabels[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
