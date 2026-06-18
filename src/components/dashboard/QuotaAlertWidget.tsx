import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDashboardQuotaAlerts } from "@/lib/api/quota.functions";
import { getAppLocale, localeIntl } from "@/lib/i18n";
import type { TienDoDinhMucRow } from "@/lib/types/vpp";

function fmt(n: number) {
  return new Intl.NumberFormat(localeIntl[getAppLocale()]).format(n);
}

export function QuotaAlertWidget() {
  const { t } = useTranslation();
  const { data: alerts = [], isLoading, isError } = useQuery({
    queryKey: ["dashboard-quota-alerts"],
    queryFn: () => getDashboardQuotaAlerts(),
    refetchOnWindowFocus: true,
  });

  const totalAlerts = alerts.length;
  const monthLabel = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

  return (
    <section className="card-elevated overflow-hidden fluid-in">
      <div className="px-5 py-4 border-b border-border/70 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14.5px] font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            {t("quotaWidget.title")}
          </h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            {t("quotaWidget.subtitle", { month: monthLabel })}
          </p>
        </div>
        {totalAlerts > 0 && (
          <Badge variant="destructive" className="text-[10px] px-2 py-0 shrink-0 animate-pulse">
            {t("quotaWidget.hotSpots", { count: totalAlerts })}
          </Badge>
        )}
      </div>

      <div className="p-4 max-h-[280px] overflow-y-auto space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("quotaWidget.scanning")}
          </div>
        )}
        {isError && (
          <p className="text-[12px] text-destructive py-4 text-center">{t("quotaWidget.loadError")}</p>
        )}
        {!isLoading && !isError && totalAlerts === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-8 text-success mb-2" />
            <p className="text-[12.5px] font-medium">{t("quotaWidget.safe")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("quotaWidget.safeDesc")}</p>
          </div>
        )}
        {!isLoading &&
          alerts.map((item) => (
            <QuotaAlertRow key={`${item.maNV}-${item.maHang}`} item={item} />
          ))}
      </div>

      <div className="px-4 pb-4 pt-0 flex items-center justify-between gap-2 text-[11px]">
        <Link to="/staff" className="text-primary font-medium hover:underline">
          {t("quotaWidget.viewStaff")} →
        </Link>
        <Link to="/quotas" className="text-muted-foreground hover:text-primary hover:underline">
          {t("quotaWidget.configQuota")}
        </Link>
      </div>
    </section>
  );
}

function QuotaAlertRow({ item }: { item: TienDoDinhMucRow }) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round(item.phanTramDaDung));
  const isMaxedOut = item.phanTramDaDung >= 100;
  const barColor = isMaxedOut ? "bg-destructive" : "bg-warning";

  return (
    <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold truncate">
            {item.hoTen}{" "}
            <span className="text-muted-foreground font-normal font-mono text-[11px]">({item.maNV})</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">{item.chucDanh}</div>
        </div>
        <span
          className={[
            "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded",
            isMaxedOut ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground/90",
          ].join(" ")}
        >
          {isMaxedOut ? t("quotaWidget.quotaDepleted") : t("quotaWidget.usedPct", { pct })}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] gap-2">
          <span className="truncate font-medium">{item.tenSanPham}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {fmt(item.daDung)} / {fmt(item.soLuongToiDa)} {item.donViTinh}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
