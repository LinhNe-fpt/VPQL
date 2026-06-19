import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Globe,
  Loader2,
  Monitor,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Topbar } from "@/components/topbar";
import { getLoginHistory } from "@/lib/api/login-history.functions";
import { useClientSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/login-history")({
  head: () => ({
    meta: [
      { title: "Lịch sử đăng nhập – Stockflow" },
      { name: "description", content: "Theo dõi đăng nhập hệ thống và địa chỉ IP máy truy cập." },
    ],
  }),
  component: LoginHistoryPage,
});

function LoginHistoryPage() {
  const { t } = useTranslation();
  const session = useClientSession();
  const [q, setQ] = useState("");

  const isAdmin = session?.role === "admin";

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["login-history", session?.username, q.trim() || null],
    queryFn: () =>
      getLoginHistory({
        data: {
          viewerUsername: session!.username,
          q: q.trim() || null,
          limit: 150,
        },
      }),
    enabled: !!session?.username,
  });

  const stats = useMemo(() => {
    const success = rows.filter((r) => r.ketQua === "SUCCESS").length;
    const failed = rows.filter((r) => r.ketQua === "FAILED").length;
    const ips = new Set(rows.map((r) => r.diaChiIP));
    return { total: rows.length, success, failed, uniqueIps: ips.size };
  }, [rows]);

  return (
    <>
      <Topbar title={t("pages.loginHistory.title")} subtitle={t("pages.loginHistory.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={t("pages.loginHistory.statTotal")} value={stats.total} />
          <StatCard label={t("pages.loginHistory.statSuccess")} value={stats.success} tone="success" />
          <StatCard label={t("pages.loginHistory.statFailed")} value={stats.failed} tone="danger" />
          <StatCard label={t("pages.loginHistory.statIps")} value={stats.uniqueIps} tone="info" />
        </div>

        {!isAdmin && (
          <p className="text-[12px] text-muted-foreground">{t("pages.loginHistory.scopeSelf")}</p>
        )}

        <div className="card-elevated p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[220px]">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("pages.loginHistory.searchPlaceholder")}
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-[13px]">
            <Loader2 className="size-4 animate-spin" />
            {t("pages.loginHistory.loading")}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 flex items-start gap-2 text-[13px] text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error instanceof Error ? error.message : t("pages.loginHistory.loadError")}</span>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-14 text-center text-[13px] text-muted-foreground">
            {t("pages.loginHistory.empty")}
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-left border-b border-border/60">
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colTime")}</th>
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colUser")}</th>
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colMethod")}</th>
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colResult")}</th>
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colIp")}</th>
                    <th className="px-4 py-2.5 font-semibold text-[10px] uppercase">{t("pages.loginHistory.colDevice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{row.ngayGio}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{row.hoTen ?? row.maDangNhap}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{row.maDangNhap}</div>
                      </td>
                      <td className="px-4 py-2.5">{row.phuongThucLabel}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={[
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                            row.ketQua === "SUCCESS"
                              ? "bg-success/12 text-success-foreground border-success/25"
                              : "bg-destructive/10 text-destructive border-destructive/25",
                          ].join(" ")}
                        >
                          {row.ketQua === "SUCCESS" ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <ShieldAlert className="size-3" />
                          )}
                          {row.ketQuaLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-primary">
                          <Globe className="size-3 shrink-0" />
                          {row.diaChiIP}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[280px]">
                        <span className="inline-flex items-start gap-1 text-[11px] text-muted-foreground line-clamp-2" title={row.userAgent ?? undefined}>
                          <Monitor className="size-3 shrink-0 mt-0.5" />
                          {shortUserAgent(row.userAgent) ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function shortUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 69)}…`;
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger" | "info";
}) {
  const tones = {
    success: "text-success-foreground",
    danger: "text-destructive",
    info: "text-info",
  };
  return (
    <div className="card-elevated p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={["mt-1 text-[22px] font-semibold tabular-nums", tone ? tones[tone] : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
