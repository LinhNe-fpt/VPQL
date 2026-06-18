import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowRight,
  History,
  Loader2,
  Search,
  User,
  ShieldCheck,
} from "lucide-react";

import { Topbar } from "@/components/topbar";
import { getAuditHistory } from "@/lib/api/audit.functions";
import type { AuditAction, AuditLogGroup } from "@/lib/types/vpp";

export const Route = createFileRoute("/_authenticated/audit-log")({
  head: () => ({
    meta: [
      { title: "Lịch sử thay đổi – Stockflow" },
      { name: "description", content: "Theo dõi thay đổi nhân sự và định mức để đối chiếu." },
    ],
  }),
  component: AuditLogPage,
  validateSearch: (search: Record<string, unknown>) => ({
    bang: typeof search.bang === "string" ? search.bang : undefined,
    ma: typeof search.ma === "string" ? search.ma : undefined,
  }),
});

const BANG_OPTIONS = [
  { value: "", labelKey: "pages.auditLog.filterAll" },
  { value: "DanhMucNhanVien", labelKey: "pages.auditLog.tableStaff" },
  { value: "DinhMucCapPhat", labelKey: "pages.auditLog.tableQuota" },
] as const;

const ACTION_TONE: Record<AuditAction, string> = {
  CREATE: "bg-success/15 text-success-foreground border-success/25",
  UPDATE: "bg-info/12 text-info border-info/20",
  DELETE: "bg-destructive/12 text-destructive border-destructive/25",
};

function AuditLogPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const [bangDuLieu, setBangDuLieu] = useState(search.bang ?? "");
  const [q, setQ] = useState(search.ma ?? "");

  const queryKey = ["audit-log", bangDuLieu || null, q.trim() || null] as const;
  const { data: groups = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      getAuditHistory({
        data: {
          bangDuLieu: bangDuLieu || null,
          maBanGhi: q.trim() || null,
          q: q.trim() || null,
          limit: 200,
        },
      }),
  });

  const stats = useMemo(() => {
    return {
      total: groups.length,
      updates: groups.filter((g) => g.hanhDong === "UPDATE").length,
      creates: groups.filter((g) => g.hanhDong === "CREATE").length,
      deletes: groups.filter((g) => g.hanhDong === "DELETE").length,
    };
  }, [groups]);

  return (
    <>
      <Topbar title={t("pages.auditLog.title")} subtitle={t("pages.auditLog.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={t("pages.auditLog.statTotal")} value={stats.total} />
          <StatCard label={t("pages.auditLog.statCreate")} value={stats.creates} tone="success" />
          <StatCard label={t("pages.auditLog.statUpdate")} value={stats.updates} tone="info" />
          <StatCard label={t("pages.auditLog.statDelete")} value={stats.deletes} tone="danger" />
        </div>

        <div className="card-elevated p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[220px]">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("pages.auditLog.searchPlaceholder")}
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
          </div>
          <select
            value={bangDuLieu}
            onChange={(e) => setBangDuLieu(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none"
          >
            {BANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-[13px]">
            <Loader2 className="size-4 animate-spin" />
            {t("pages.auditLog.loading")}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 flex items-start gap-2 text-[13px] text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error instanceof Error ? error.message : t("pages.auditLog.loadError")}</span>
          </div>
        )}

        {!isLoading && !isError && groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/80 py-16 text-center text-[13px] text-muted-foreground">
            <History className="size-8 mx-auto mb-3 opacity-40" />
            {t("pages.auditLog.empty")}
          </div>
        )}

        <div className="space-y-3">
          {groups.map((group, idx) => (
            <AuditGroupCard key={group.batchId} group={group} delay={idx * 30} />
          ))}
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "info" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "border-success/20 bg-success/8"
      : tone === "info"
        ? "border-info/20 bg-info/8"
        : tone === "danger"
          ? "border-destructive/20 bg-destructive/8"
          : "border-border/70 bg-card";
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function AuditGroupCard({ group, delay }: { group: AuditLogGroup; delay: number }) {
  const { t } = useTranslation();
  const Icon = group.bangDuLieu === "DanhMucNhanVien" ? User : ShieldCheck;

  return (
    <article
      style={{ animationDelay: `${delay}ms` }}
      className="card-elevated overflow-hidden fluid-in"
    >
      <div className="px-4 py-3 border-b border-border/60 flex flex-wrap items-center gap-3 justify-between bg-muted/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] font-semibold">{group.maBanGhi}</span>
              <span className="text-[11px] text-muted-foreground">· {group.tenBang}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {group.ngayGio}
              {group.nguoiThayDoi && (
                <>
                  {" · "}
                  {t("pages.auditLog.byUser", { user: group.nguoiThayDoi })}
                </>
              )}
            </div>
          </div>
        </div>
        <span
          className={[
            "inline-flex px-2.5 py-1 rounded-md border text-[11px] font-semibold",
            ACTION_TONE[group.hanhDong],
          ].join(" ")}
        >
          {group.hanhDongLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-muted-foreground text-[10px] uppercase">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">{t("pages.auditLog.colField")}</th>
              <th className="px-4 py-2 text-left font-semibold">{t("pages.auditLog.colBefore")}</th>
              <th className="px-4 py-2 w-8" />
              <th className="px-4 py-2 text-left font-semibold">{t("pages.auditLog.colAfter")}</th>
            </tr>
          </thead>
          <tbody>
            {group.changes.map((change) => (
              <tr key={change.id} className="border-t border-border/50">
                <td className="px-4 py-2.5 font-medium whitespace-nowrap">{change.tenTruong}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  <ValueCell value={change.giaTriCu} empty={t("pages.auditLog.emptyValue")} variant="old" />
                </td>
                <td className="px-2 py-2.5 text-muted-foreground">
                  <ArrowRight className="size-3.5" />
                </td>
                <td className="px-4 py-2.5">
                  <ValueCell value={change.giaTriMoi} empty={t("pages.auditLog.emptyValue")} variant="new" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ValueCell({
  value,
  empty,
  variant,
}: {
  value: string | null;
  empty: string;
  variant: "old" | "new";
}) {
  if (!value) {
    return <span className="text-[11px] italic opacity-60">{empty}</span>;
  }
  return (
    <span
      className={[
        "inline-block px-2 py-0.5 rounded-md font-medium",
        variant === "old" ? "bg-muted/60 line-through decoration-muted-foreground/40" : "bg-primary/8 text-foreground",
      ].join(" ")}
    >
      {value}
    </span>
  );
}
