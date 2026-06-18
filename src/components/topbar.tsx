import { Bell, Command, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MobileNav, UserProfileBadge } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 mica px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-4 border-b border-border/60">
      <MobileNav />

      <div className="flex-1 min-w-0">
        <h1 className="text-[16px] sm:text-[17px] font-semibold tracking-tight text-foreground leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-tight mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border/70 shadow-sm w-80">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          placeholder={t("topbar.searchPlaceholder")}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/70"
        />
        <kbd className="flex items-center gap-0.5 text-[10.5px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          <Command className="size-2.5" />K
        </kbd>
      </div>

      <LanguageSwitcher compact className="hidden sm:flex" />

      <button
        type="button"
        className="size-9 shrink-0 rounded-lg grid place-items-center hover:bg-muted transition-colors relative"
        aria-label={t("common.notifications")}
      >
        <Bell className="size-4 text-foreground/70" />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
      </button>

      <div className="hidden sm:block h-8 w-px bg-border shrink-0" />

      <div className="pr-1 shrink-0">
        <UserProfileBadge />
      </div>
    </header>
  );
}
