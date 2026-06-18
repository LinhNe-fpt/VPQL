import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QuotaAlertWidget } from "@/components/dashboard/QuotaAlertWidget";
import { Topbar } from "@/components/topbar";
import { getVatTuList } from "@/lib/api/inventory.functions";
import { getVoucherList } from "@/lib/api/voucher.functions";
import { VOUCHER_LABEL } from "@/lib/types/vpp";
import { ArrowDownRight, ArrowUpRight, Boxes, AlertTriangle, Wallet, TrendingUp, Loader2, RotateCcw } from "lucide-react";
import type { VoucherType } from "@/lib/types/vpp";
import { getAppLocale, localeIntl, type AppLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Tổng quan kho – Stockflow" },
      { name: "description", content: "Bảng tổng quan tồn kho và hoạt động giao dịch." },
    ],
  }),
  component: Dashboard,
});

function fmt(n: number, locale: AppLocale) {
  return new Intl.NumberFormat(localeIntl[locale]).format(n);
}

function Dashboard() {
  const { t } = useTranslation();
  const locale = getAppLocale();
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["vat-tu"],
    queryFn: () => getVatTuList(),
  });
  const { data: vouchers = [], isLoading: loadingVouchers } = useQuery({
    queryKey: ["vouchers"],
    queryFn: () => getVoucherList(),
  });

  const totalSkus = items.length;
  const lowStockItems = items.filter((i) => i.soLuongTon <= i.minStock);
  const lowStock = lowStockItems.length;
  const totalValue = items.reduce((s, i) => s + i.soLuongTon * i.donGia, 0);

  const today = new Date().toLocaleDateString(localeIntl[locale]);
  const todayIssue = vouchers.filter((v) => {
    const d = new Date(v.ngayLap);
    return v.loaiPhieu !== "NHAP" && d.toLocaleDateString(localeIntl[locale]) === today;
  }).length;

  const loading = loadingItems || loadingVouchers;

  return (
    <>
      <Topbar title={t("pages.dashboard.title")} subtitle={t("pages.dashboard.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-[13px]">
            <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric icon={<Boxes className="size-4" />} label={t("pages.dashboard.totalSkus")} value={fmt(totalSkus, locale)} delta={t("pages.dashboard.inCatalog")} tone="primary" />
          <Metric icon={<AlertTriangle className="size-4" />} label={t("pages.dashboard.lowStock")} value={fmt(lowStock, locale)} delta={t("pages.dashboard.belowMin", { count: lowStock })} tone="warning" />
          <Metric icon={<Wallet className="size-4" />} label={t("pages.dashboard.stockValue")} value={`${fmt(Math.round(totalValue / 1_000_000), locale)}M ₫`} delta={t("pages.dashboard.stockValueHint")} tone="success" />
          <Metric icon={<TrendingUp className="size-4" />} label={t("pages.dashboard.todayExport")} value={fmt(todayIssue, locale)} delta={today} tone="info" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="card-elevated p-5 lg:col-span-2 fluid-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14.5px] font-semibold tracking-tight">{t("pages.dashboard.minStockAlert")}</h2>
                <p className="text-[11.5px] text-muted-foreground">{t("pages.dashboard.minStockDesc")}</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground/90 font-medium">{t("common.alerts", { count: lowStock })}</span>
            </div>
            <div className="divide-y divide-border/70">
              {lowStockItems.slice(0, 6).map((i) => (
                <div key={i.maHang} className="flex items-center gap-3 py-2.5">
                  <div className="size-8 rounded-lg bg-warning/12 text-[10.5px] font-semibold grid place-items-center text-warning-foreground/90">
                    {(i.nhomHang ?? "—").slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{i.tenSanPham}</div>
                    <div className="text-[11px] text-muted-foreground">{i.maHang} · {i.nhomHang ?? "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-warning-foreground/90">
                      {fmt(i.soLuongTon, locale)} <span className="text-[10.5px] text-muted-foreground font-normal">/ {fmt(i.minStock, locale)}</span>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">{i.donViTinh}</div>
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && !loading && (
                <p className="text-[13px] text-muted-foreground py-4">{t("pages.dashboard.noLowStock")}</p>
              )}
            </div>
          </section>

          <div className="space-y-4">
            <QuotaAlertWidget />
            <section className="card-elevated p-5 fluid-in">
              <div className="mb-4">
                <h2 className="text-[14.5px] font-semibold tracking-tight">{t("pages.dashboard.recentActivity")}</h2>
                <p className="text-[11.5px] text-muted-foreground">{t("pages.dashboard.recentActivityDesc")}</p>
              </div>
              <div className="space-y-3">
                {vouchers.slice(0, 5).map((v) => (
                  <div key={v.soPhieu} className="flex items-start gap-3">
                    <div
                      className={[
                        "size-8 rounded-lg grid place-items-center shrink-0",
                        v.loaiPhieu === "NHAP"
                          ? "bg-info/12 text-info"
                          : v.loaiPhieu === "THU_HOI"
                            ? "bg-warning/15 text-warning-foreground/90"
                            : v.loaiPhieu === "XUAT_CN"
                              ? "bg-success/15 text-success-foreground/90"
                              : "bg-[oklch(0.6_0.18_295)]/15 text-[oklch(0.45_0.2_295)]",
                      ].join(" ")}
                    >
                      <DashboardVoucherIcon type={v.loaiPhieu} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{v.recipient}</div>
                      <div className="text-[10.5px] text-muted-foreground">{v.soPhieu} · {VOUCHER_LABEL[v.loaiPhieu]}</div>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground whitespace-nowrap">{v.ngayLap.split(" ")[1] ?? v.ngayLap}</div>
                  </div>
                ))}
                {vouchers.length === 0 && !loading && (
                  <p className="text-[13px] text-muted-foreground">{t("pages.dashboard.noVouchers")}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function DashboardVoucherIcon({ type }: { type: VoucherType }) {
  if (type === "NHAP") return <ArrowDownRight className="size-4" />;
  if (type === "THU_HOI") return <RotateCcw className="size-4" />;
  return <ArrowUpRight className="size-4" />;
}

function Metric({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  tone: "primary" | "warning" | "success" | "info";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground/90",
    success: "bg-success/15 text-success-foreground/90",
    info: "bg-info/12 text-info",
  } as const;
  return (
    <div className="card-elevated p-5 fluid-in">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground font-medium">{label}</span>
        <span className={`size-8 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</span>
      </div>
      <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none">{value}</div>
      <div className="mt-2 text-[11.5px] text-muted-foreground">{delta}</div>
    </div>
  );
}
