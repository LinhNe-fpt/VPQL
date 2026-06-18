import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  FileStack,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Zap,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  Shirt,
  Package,
} from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLogoutRequest } from "@/components/auth/logout-flow";
import {
  formatShortName,
  getInitials,
  getRoleLabel,
  getRoleSubtitle,
  useClientSession,
  type UserSession,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

export const navItems = [
  { titleKey: "nav.dashboard", url: "/", icon: LayoutDashboard },
  { titleKey: "nav.inventory", url: "/inventory", icon: Boxes },
  { titleKey: "nav.products", url: "/products", icon: Package },
  { titleKey: "nav.transactions", url: "/transactions", icon: FileStack },
  { titleKey: "nav.cuocDo", url: "/cuoc-do", icon: Shirt },
  { titleKey: "nav.staff", url: "/staff", icon: Users },
  { titleKey: "nav.quotas", url: "/quotas", icon: ShieldCheck },
  { titleKey: "nav.reports", url: "/reports", icon: BarChart3 },
  { titleKey: "nav.auditLog", url: "/audit-log", icon: History },
  { titleKey: "nav.settings", url: "/settings", icon: Settings },
] as const;

function useAuthSession(): UserSession | null {
  return useClientSession();
}

function SidebarBrand() {
  const { t } = useTranslation();
  return (
    <div className="px-5 pt-6 pb-5">
      <div className="flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.62_0.28_280)] grid place-items-center shadow-[0_8px_24px_-6px_rgba(0,56,255,0.55)]">
          <Zap className="size-4.5 text-white" strokeWidth={2.4} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-white">Stockflow</span>
          <span className="text-[11px] text-sidebar-foreground/60">{t("common.edition")}</span>
        </div>
      </div>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
      <div className="px-2 pb-2 pt-1 text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
        {t("common.phanHe")}
      </div>
      {navItems.map((item) => {
        const active = isActive(item.url);
        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            className={[
              "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-200",
              active
                ? "bg-sidebar-primary/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white",
            ].join(" ")}
          >
            <item.icon
              className={[
                "size-4",
                active ? "text-primary" : "text-sidebar-foreground/55 group-hover:text-white",
              ].join(" ")}
            />
            <span className="font-medium">{t(item.titleKey)}</span>
            {active && (
              <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(0,56,255,0.8)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarUserCard({
  session,
  onBeforeLogout,
}: {
  session: UserSession | null;
  onBeforeLogout?: () => void;
}) {
  const { t } = useTranslation();
  const requestLogout = useLogoutRequest();
  const displayName = session?.displayName ?? t("common.user");
  const roleLabel = session ? getRoleLabel(session.role) : "—";

  function handleLogout() {
    onBeforeLogout?.();
    requestLogout();
  }

  return (
    <div className="m-3 rounded-xl bg-sidebar-accent/60 border border-sidebar-border/60 p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-primary/80 to-[oklch(0.7_0.2_290)] grid place-items-center text-[12px] font-semibold text-white">
          {getInitials(displayName)}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[12.5px] font-medium text-white truncate">{displayName}</div>
          <div className="text-[10.5px] text-sidebar-foreground/55 truncate">{roleLabel}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-white"
          title={t("common.logoutTitle")}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AppSidebar({ className }: { className?: string }) {
  const session = useAuthSession();

  return (
    <aside
      className={cn(
        "hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        className,
      )}
    >
      <SidebarBrand />
      <SidebarNav />
      <SidebarUserCard session={session} />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const session = useAuthSession();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden size-9 shrink-0 rounded-lg grid place-items-center hover:bg-muted transition-colors"
        aria-label="Menu"
      >
        <Menu className="size-5 text-foreground/80" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground/70 [&>button]:hover:text-white"
        >
          <div className="flex h-full flex-col">
            <SidebarBrand />
            <SidebarNav onNavigate={() => setOpen(false)} />
            <SidebarUserCard session={session} onBeforeLogout={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Thông tin người dùng đồng bộ với sidebar (dùng trong topbar). */
export function UserProfileBadge({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const session = useAuthSession();
  const displayName = session?.displayName ?? t("common.user");
  const subtitle = session ? getRoleSubtitle(session.role) : "";

  return (
    <div className="flex items-center gap-2.5">
      <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-primary/80 to-[oklch(0.7_0.2_290)] grid place-items-center text-[11.5px] font-semibold text-white">
        {getInitials(displayName)}
      </div>
      {!compact && (
        <div className="hidden md:block min-w-0 leading-tight">
          <div className="text-[12.5px] font-medium truncate">{formatShortName(displayName)}</div>
          {subtitle && (
            <div className="text-[10.5px] text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
}
