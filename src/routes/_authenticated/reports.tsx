import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Topbar } from "@/components/topbar";
import {
  buildReportDocRef,
  ReportAlertBox,
  ReportDataTable,
  ReportDocumentFooter,
  ReportDocumentHeader,
  ReportEmptyState,
  ReportKpiCard,
  ReportKpiGrid,
  ReportSectionTitle,
} from "@/components/report-document";
import { ReportPrintStyles } from "@/components/report-print-styles";
import { getReportData } from "@/lib/api/reports.functions";
import { getIssuerName, useClientSession } from "@/lib/auth";
import { getAppLocale, type AppLocale } from "@/lib/i18n";
import { exportReportExcel } from "@/lib/report-excel";
import {
  REPORT_LOAI_OPTIONS,
  buildExecutiveSummary,
  buildPeriodLabel,
  deptFilterOptions,
  filterDistributionLines,
  filterReportLines,
  fmtMoney,
  fmtNum,
  inventoryRows,
  monthStartInput,
  todayInput,
  type ReportFilters,
  type ReportMeta,
  type ReportTemplateId,
} from "@/lib/report-workspace";
import {
  reportBi,
  reportTemplateBi,
  REPORT_BI,
  REPORT_TEMPLATE_BI,
  voucherLabelBi,
} from "@/lib/report-i18n";
import { formatBoPhanLabel } from "@/lib/bo-phan";
import type { ReportLineRow } from "@/lib/vpp-queries.server";
import { VOUCHER_LABEL, type VatTuRow, type VoucherType } from "@/lib/types/vpp";
import {
  Briefcase,
  Building2,
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Printer,
  Shirt,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [{ title: "Báo cáo quản trị – Stockflow" }],
  }),
  component: ReportsPage,
});

const TEMPLATE_ICONS: Record<ReportTemplateId, React.ReactNode> = {
  executive: <Briefcase className="size-4" />,
  transactions: <FileText className="size-4" />,
  inventory: <Package className="size-4" />,
  distribution: <Shirt className="size-4" />,
};

const TEMPLATE_IDS: ReportTemplateId[] = ["executive", "transactions", "inventory", "distribution"];

function templateUiLabel(id: ReportTemplateId, locale: AppLocale): string {
  const bi = REPORT_TEMPLATE_BI[id];
  return locale === "ko" ? bi.label.ko : bi.label.vi;
}

function templateUiDesc(id: ReportTemplateId, locale: AppLocale): string {
  const bi = REPORT_TEMPLATE_BI[id];
  const primary = locale === "ko" ? bi.description.ko : bi.description.vi;
  const alt = locale === "ko" ? bi.label.vi : bi.label.ko;
  return `${primary} · ${alt}`;
}

function ReportsPage() {
  const { t, i18n } = useTranslation();
  const locale = getAppLocale();
  const session = useClientSession();
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReportData(),
  });

  const [template, setTemplate] = useState<ReportTemplateId>("executive");
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: monthStartInput(),
    dateTo: todayInput(),
    dept: "ALL",
    nhom: "ALL",
    loai: "ALL",
  });
  const [title, setTitle] = useState(() => reportTemplateBi("executive", "title"));

  const lines = data?.lines ?? [];
  const vouchers = data?.vouchers ?? [];
  const vatTu = data?.vatTu ?? [];
  const quotaAlerts = data?.quotaAlerts ?? [];
  const boPhan = data?.boPhan ?? [];

  const deptOptions = useMemo(() => {
    const opts = deptFilterOptions(boPhan);
    return opts.map((d) =>
      d.value === "ALL" ? { ...d, label: t("pages.reports.allDepts") } : d,
    );
  }, [boPhan, t, i18n.language]);

  const nhomOptions = useMemo(() => {
    const set = new Set(lines.map((l) => l.nhomHang).filter(Boolean) as string[]);
    return ["ALL", ...Array.from(set).sort()];
  }, [lines]);

  const filteredLines = useMemo(() => {
    const base = filterReportLines(lines, filters);
    return template === "distribution" ? filterDistributionLines(base) : base;
  }, [lines, filters, template]);

  const meta: ReportMeta = useMemo(
    () => ({
      title,
      periodLabel: buildPeriodLabel(filters.dateFrom, filters.dateTo),
      preparedBy: getIssuerName(session),
      generatedAt: new Date().toLocaleString("vi-VN", { hour12: false }),
    }),
    [title, filters.dateFrom, filters.dateTo, session],
  );

  const docRef = useMemo(() => buildReportDocRef(template), [template]);

  const executive = useMemo(
    () => buildExecutiveSummary(filteredLines, vouchers, vatTu, quotaAlerts, boPhan),
    [filteredLines, vouchers, vatTu, quotaAlerts, boPhan],
  );

  function patchFilters(patch: Partial<ReportFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function handleTemplateChange(id: ReportTemplateId) {
    setTemplate(id);
    setTitle(reportTemplateBi(id, "title"));
  }

  function handleExport() {
    exportReportExcel({
      template,
      meta,
      lines: filteredLines,
      vatTu,
      boPhan,
      vouchers,
      quotaAlerts,
      nhomFilter: filters.nhom,
    });
  }

  return (
    <>
      <ReportPrintStyles />

      <div className="no-print">
        <Topbar title={t("pages.reports.title")} subtitle={t("pages.reports.subtitle")} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-[360px_1fr] report-print-root">
        <aside className="no-print flex flex-col border-r border-border/70 bg-background/50 min-h-0 overflow-hidden">
          <div className="p-4 border-b border-border/70">
            <h2 className="text-[13px] font-semibold tracking-tight">{t("pages.reports.workspaceTitle")}</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{t("pages.reports.workspaceDesc")}</p>
            <p className="text-[10.5px] text-muted-foreground/90 mt-1.5">{t("pages.reports.bilingualNote")}</p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-5">
            <section className="space-y-2">
              <span className="text-[10.5px] uppercase font-semibold text-muted-foreground">
                {t("pages.reports.templateSection")}
              </span>
              <div className="space-y-2">
                {TEMPLATE_IDS.map((tplId) => (
                  <button
                    key={tplId}
                    type="button"
                    onClick={() => handleTemplateChange(tplId)}
                    className={[
                      "w-full text-left p-3 rounded-xl border transition-all",
                      template === tplId
                        ? "border-primary/40 bg-primary/8 shadow-sm"
                        : "border-border/70 bg-card hover:border-border hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={[
                          "size-8 rounded-lg grid place-items-center shrink-0",
                          template === tplId ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {TEMPLATE_ICONS[tplId]}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold">{templateUiLabel(tplId, locale)}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                          {templateUiDesc(tplId, locale)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <span className="text-[10.5px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> {t("pages.reports.periodSection")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <ConfigField label={t("pages.reports.dateFrom")}>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                    className={inputCls}
                  />
                </ConfigField>
                <ConfigField label={t("pages.reports.dateTo")}>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => patchFilters({ dateTo: e.target.value })}
                    className={inputCls}
                  />
                </ConfigField>
              </div>
            </section>

            {template !== "inventory" && (
              <section className="space-y-3">
                <span className="text-[10.5px] uppercase font-semibold text-muted-foreground">{t("pages.reports.filtersSection")}</span>
                <ConfigField label={t("pages.reports.dept")} icon={<Building2 className="size-3" />}>
                  <select value={filters.dept} onChange={(e) => patchFilters({ dept: e.target.value })} className={inputCls}>
                    {deptOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </ConfigField>
                <ConfigField label={t("pages.reports.nhom")}>
                  <select value={filters.nhom} onChange={(e) => patchFilters({ nhom: e.target.value })} className={inputCls}>
                    {nhomOptions.map((n) => (
                      <option key={n} value={n}>
                        {n === "ALL" ? t("pages.reports.allNhom") : n}
                      </option>
                    ))}
                  </select>
                </ConfigField>
                <ConfigField label={t("pages.reports.voucherType")}>
                  <select
                    value={filters.loai}
                    onChange={(e) => patchFilters({ loai: e.target.value as ReportFilters["loai"] })}
                    className={inputCls}
                  >
                    {REPORT_LOAI_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o === "ALL" ? t("pages.reports.allVoucherTypes") : voucherLabelBi(o as VoucherType, VOUCHER_LABEL[o as VoucherType])}
                      </option>
                    ))}
                  </select>
                </ConfigField>
              </section>
            )}

            {template === "inventory" && (
              <ConfigField label={t("pages.reports.nhom")}>
                <select value={filters.nhom} onChange={(e) => patchFilters({ nhom: e.target.value })} className={inputCls}>
                  {nhomOptions.map((n) => (
                    <option key={n} value={n}>
                      {n === "ALL" ? t("pages.reports.allNhom") : n}
                    </option>
                  ))}
                </select>
              </ConfigField>
            )}

            <ConfigField label={t("pages.reports.reportTitle")}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </ConfigField>
          </div>

          <div className="p-4 border-t border-border/70 bg-muted/20 space-y-2">
            <div className="text-[11px] text-muted-foreground">
              {t("pages.reports.preparedByLabel")}: <span className="font-medium text-foreground">{meta.preparedBy}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 rounded-lg border border-border bg-card text-[12px] font-medium hover:bg-muted flex items-center justify-center gap-1.5"
              >
                <Printer className="size-3.5" /> {t("pages.reports.printPdf")}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isLoading}
                className="h-9 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary-hover flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="size-3.5" /> {t("pages.reports.excel")}
              </button>
            </div>
          </div>
        </aside>

        <main className="report-print-main overflow-auto p-4 md:p-6 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground text-[13px]">
              <Loader2 className="size-4 animate-spin" /> {t("pages.reports.loading")}
            </div>
          ) : (
            <div
              id="report-print-area"
              className="report-print-area max-w-4xl mx-auto bg-white text-foreground rounded-2xl border border-border/70 shadow-[var(--shadow-mica)] p-8 md:p-10 space-y-6"
            >
              <ReportDocumentHeader meta={meta} template={template} docRef={docRef} />

              {template === "executive" && <ExecutivePreview summary={executive} />}
              {template === "transactions" && <TransactionsPreview lines={filteredLines} />}
              {template === "inventory" && <InventoryPreview rows={inventoryRows(vatTu, filters.nhom)} />}
              {template === "distribution" && (
                <DistributionPreview lines={filteredLines} summary={executive} />
              )}

              <ReportDocumentFooter meta={meta} lineCount={filteredLines.length} skuCount={vatTu.length} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] outline-none focus:ring-2 focus:ring-primary/25";

function ConfigField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}

function ExecutivePreview({ summary }: { summary: ReturnType<typeof buildExecutiveSummary> }) {
  const alertItems: string[] = [];
  if (summary.lowStockCount > 0) {
    alertItems.push(
      `${summary.lowStockCount} ${REPORT_BI.lowStockAlert.vi} / ${REPORT_BI.lowStockAlert.ko}`,
    );
  }
  if (summary.quotaAlertCount > 0) {
    alertItems.push(
      `${summary.quotaAlertCount} ${REPORT_BI.quotaAlert.vi} / ${REPORT_BI.quotaAlert.ko}`,
    );
  }

  return (
    <div className="space-y-6">
      <ReportKpiGrid cols={4}>
        <ReportKpiCard icon={<TrendingDown className="size-4" />} label={reportBi("totalIn")} value={fmtNum(summary.totalIn)} tone="info" />
        <ReportKpiCard icon={<TrendingUp className="size-4" />} label={reportBi("totalOut")} value={fmtNum(summary.totalOut)} tone="success" />
        <ReportKpiCard
          icon={<PackageCheck className="size-4" />}
          label={reportBi("voucherCount")}
          value={fmtNum(summary.voucherCount)}
          hint={`${summary.lineCount} ${reportBi("lines")}`}
          tone="primary"
        />
        <ReportKpiCard
          icon={<Building2 className="size-4" />}
          label={reportBi("deptActive")}
          value={`${fmtNum(summary.deptCount)}/${fmtNum(summary.byDept.length)}`}
          hint={reportBi("deptActiveHint")}
          tone="warning"
        />
      </ReportKpiGrid>

      {alertItems.length > 0 && <ReportAlertBox title={reportBi("alertTitle")} items={alertItems} />}

      <section>
        <ReportSectionTitle>{reportBi("topItems")}</ReportSectionTitle>
        <ReportDataTable
          headers={[reportBi("colItemCode"), reportBi("colItemName"), reportBi("colIn"), reportBi("colOut"), reportBi("colUnit")]}
          rows={summary.topItems.map((r) => [r.maHang, r.name, fmtNum(r.qtyIn), fmtNum(r.qtyOut), r.unit])}
          numericColumns={[2, 3]}
        />
      </section>

      <section>
        <ReportSectionTitle>{reportBi("byDept")}</ReportSectionTitle>
        <ReportDataTable
          headers={[reportBi("colCode"), reportBi("colDept"), reportBi("colIn"), reportBi("colOut"), reportBi("colLineCount")]}
          rows={summary.byDept.map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            fmtNum(d.qtyIn),
            fmtNum(d.qtyOut),
            d.lineCount > 0 ? fmtNum(d.lineCount) : "—",
          ])}
          dimZero={(row) => row[4] === "—"}
          numericColumns={[2, 3, 4]}
        />
      </section>
    </div>
  );
}

function TransactionsPreview({ lines }: { lines: ReportLineRow[] }) {
  return (
    <section>
      <ReportSectionTitle>
        {reportBi("transactionDetail")} ({fmtNum(lines.length)} {reportBi("lines")})
      </ReportSectionTitle>
      {lines.length === 0 ? (
        <ReportEmptyState hint={reportBi("noTransactions")} />
      ) : (
        <ReportDataTable
          headers={[
            reportBi("colVoucher"),
            reportBi("colType"),
            reportBi("colDate"),
            reportBi("colDept"),
            reportBi("colRecipient"),
            reportBi("colItemCode"),
            reportBi("colQty"),
          ]}
          rows={lines.map((l) => [
            l.soPhieu,
            voucherLabelBi(l.loaiPhieu as VoucherType, VOUCHER_LABEL[l.loaiPhieu as VoucherType]),
            l.ngayLap.split(",")[0] ?? l.ngayLap,
            l.maBoPhan
              ? formatBoPhanLabel({ maBoPhan: l.maBoPhan, tenBoPhan: l.tenBoPhan ?? l.maBoPhan })
              : (l.tenBoPhan ?? "—"),
            l.recipient,
            l.maHang,
            fmtNum(l.soLuong),
          ])}
          compact
          numericColumns={[6]}
        />
      )}
    </section>
  );
}

function InventoryPreview({ rows }: { rows: VatTuRow[] }) {
  const totalValue = rows.reduce((s, v) => s + v.soLuongTon * v.donGia, 0);
  const lowCount = rows.filter((v) => v.soLuongTon <= v.minStock).length;

  return (
    <div className="space-y-5">
      <ReportKpiGrid>
        <ReportKpiCard icon={<Package className="size-4" />} label={reportBi("skuCount")} value={fmtNum(rows.length)} tone="primary" />
        <ReportKpiCard icon={<TrendingUp className="size-4" />} label={reportBi("stockValue")} value={fmtMoney(totalValue)} tone="success" />
        <ReportKpiCard icon={<AlertTriangle className="size-4" />} label={reportBi("lowStock")} value={fmtNum(lowCount)} tone="warning" />
      </ReportKpiGrid>
      <ReportDataTable
        headers={[
          reportBi("colCode"),
          reportBi("colItemName"),
          reportBi("colGroup"),
          reportBi("colStock"),
          reportBi("colMin"),
          reportBi("colUnitPrice"),
          reportBi("colValue"),
          reportBi("colStatus"),
        ]}
        rows={rows.map((v) => [
          v.maHang,
          v.tenSanPham,
          v.nhomHang ?? "—",
          fmtNum(v.soLuongTon),
          fmtNum(v.minStock),
          fmtMoney(v.donGia),
          fmtMoney(v.soLuongTon * v.donGia),
          v.soLuongTon <= v.minStock ? "⚠" : "",
        ])}
        compact
        numericColumns={[3, 4]}
        alignments={["left", "left", "left", "center", "center", "right", "right", "center"]}
      />
    </div>
  );
}

function DistributionPreview({
  lines,
  summary,
}: {
  lines: ReportLineRow[];
  summary: ReturnType<typeof buildExecutiveSummary>;
}) {
  return (
    <div className="space-y-5">
      <ReportKpiGrid cols={2}>
        <ReportKpiCard icon={<TrendingUp className="size-4" />} label={reportBi("totalOutReturn")} value={fmtNum(summary.totalOut)} tone="success" />
        <ReportKpiCard icon={<PackageCheck className="size-4" />} label={reportBi("voucherCount")} value={fmtNum(summary.voucherCount)} tone="primary" />
      </ReportKpiGrid>
      <section>
        <ReportSectionTitle>{reportBi("byDeptShort")}</ReportSectionTitle>
        <ReportDataTable
          headers={[reportBi("colCode"), reportBi("colDept"), reportBi("colOutReturn"), reportBi("colLineCount")]}
          rows={summary.byDept.map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            fmtNum(d.qtyOut),
            d.lineCount > 0 ? fmtNum(d.lineCount) : "—",
          ])}
          dimZero={(row) => row[3] === "—"}
          numericColumns={[2, 3]}
        />
      </section>
      <section>
        <ReportSectionTitle>{reportBi("byItem")}</ReportSectionTitle>
        <ReportDataTable
          headers={[reportBi("colItemCode"), reportBi("colName"), reportBi("colGroup"), reportBi("colQtyLong"), reportBi("colUnit")]}
          rows={summary.topItems.map((r) => [r.maHang, r.name, r.nhom ?? "—", fmtNum(r.qtyOut), r.unit])}
          numericColumns={[3]}
        />
      </section>
      <section>
        <ReportSectionTitle>
          {reportBi("detail")} ({fmtNum(lines.length)} {reportBi("lines")})
        </ReportSectionTitle>
        {lines.length === 0 ? (
          <ReportEmptyState hint={reportBi("noDistribution")} />
        ) : (
          <ReportDataTable
            headers={[
              reportBi("colVoucher"),
              reportBi("colType"),
              reportBi("colDate"),
              reportBi("colDept"),
              reportBi("colRecipient"),
              reportBi("colCode"),
              reportBi("colQty"),
            ]}
            rows={lines.slice(0, 50).map((l) => [
              l.soPhieu,
              voucherLabelBi(l.loaiPhieu as VoucherType, VOUCHER_LABEL[l.loaiPhieu as VoucherType]),
              l.ngayLap.split(",")[0] ?? l.ngayLap,
              l.maBoPhan
                ? formatBoPhanLabel({ maBoPhan: l.maBoPhan, tenBoPhan: l.tenBoPhan ?? l.maBoPhan })
                : (l.tenBoPhan ?? "—"),
              l.recipient,
              l.maHang,
              fmtNum(l.soLuong),
            ])}
            compact
            numericColumns={[6]}
          />
        )}
        {lines.length > 50 && (
          <p className="text-[11px] text-muted-foreground mt-2 italic print:text-[8pt]">
            {REPORT_BI.previewLimit.vi.replace("{{total}}", String(lines.length))} /{" "}
            {REPORT_BI.previewLimit.ko.replace("{{total}}", String(lines.length))}
          </p>
        )}
      </section>
    </div>
  );
}
