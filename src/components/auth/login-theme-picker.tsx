import { Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LOGIN_THEME_IDS,
  LOGIN_THEMES,
  type LoginThemeId,
} from "@/lib/login-theme";
import { cn } from "@/lib/utils";

type LoginThemePickerProps = {
  themeId: LoginThemeId;
  onThemeChange: (id: LoginThemeId) => void;
  compact?: boolean;
  className?: string;
};

export function LoginThemePicker({ themeId, onThemeChange, compact, className }: LoginThemePickerProps) {
  const { t } = useTranslation();

  function pick(id: LoginThemeId) {
    onThemeChange(id);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border text-sm font-medium transition-colors",
            compact
              ? "h-9 px-3 border-white/40 bg-white/55 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white/70"
              : "h-10 px-4 border-border bg-background text-foreground hover:bg-accent",
            className,
          )}
          aria-label={t("login.themeLabel")}
        >
          <Palette className="size-4 shrink-0" />
          {!compact && <span>{t(`login.themes.${themeId}`)}</span>}
          {compact && (
            <span
              className="size-3.5 rounded-full border border-white/60 shadow-sm"
              style={{ background: LOGIN_THEMES[themeId].accent }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <p className="text-sm font-semibold text-foreground">{t("login.themeLabel")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("login.themeDesc")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {LOGIN_THEME_IDS.map((id) => {
            const theme = LOGIN_THEMES[id];
            const active = id === themeId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className={cn(
                  "group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
                  active
                    ? "border-primary/50 bg-primary/5 ring-2 ring-primary/25"
                    : "border-border/70 hover:border-primary/30 hover:bg-accent/40",
                )}
                aria-pressed={active}
                aria-label={t(`login.themes.${id}`)}
              >
                <span
                  className="h-9 w-full rounded-lg border border-white/50 shadow-sm"
                  style={{
                    background: `linear-gradient(145deg, ${theme.petalFace[0]} 0%, ${theme.petalFace[1]} 45%, ${theme.petalFace[2]} 100%)`,
                  }}
                />
                <span className="text-[11px] font-medium text-foreground">{t(`login.themes.${id}`)}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
