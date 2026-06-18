import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Topbar } from "@/components/topbar";
import { getReportData } from "@/lib/api/reports.functions";
import { useClientSession } from "@/lib/auth";
import { exportReportExcel } from "@/lib/report-excel";
import {
  REPORT_LOAI_OPTIONS,
  REPORT_TEMPLATES,
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

function ReportsPage() {
  const { t } = useTranslation();
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
  const [title, setTitle] = useState("Báo cáo tổng hợp kho vật tư");

  const lines = data?.lines ?? [];
  const vouchers = data?.vouchers ?? [];
  const vatTu = data?.vatTu ?? [];
  const quotaAlerts = data?.quotaAlerts ?? [];
  const boPhan = data?.boPhan ?? [];

  const deptOptions = useMemo(() => deptFilterOptions(boPhan), [boPhan]);

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
      preparedBy: session?.displayName ?? session?.username ?? "Thủ kho",
      generatedAt: new Date().toLocaleString("vi-VN", { hour12: false }),
    }),
    [title, filters.dateFrom, filters.dateTo, session],
  );

  const executive = useMemo(
    () => buildExecutiveSummary(filteredLines, vouchers, vatTu, quotaAlerts, boPhan),
    [filteredLines, vouchers, vatTu, quotaAlerts, boPhan],
  );

  function patchFilters(patch: Partial<ReportFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
  }

  function handleTemplateChange(id: ReportTemplateId) {
    setTemplate(id);
    const tpl = REPORT_TEMPLATES.find((x) => x.id === id);
    if (tpl) setTitle(`Báo cáo ${tpl.label.toLowerCase()}`);
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
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-print-root {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
            background: white !important;
          }
          .report-print-area {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 12mm !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Topbar title={t("pages.reports.title")} subtitle={t("pages.reports.subtitle")} />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-[360px_1fr] report-print-root">
        {/* —— Cấu hình —— */}
        <aside className="no-print flex flex-col border-r border-border/70 bg-background/50 min-h-0 overflow-hidden">
          <div className="p-4 border-b border-border/70">
            <h2 className="text-[13px] font-semibold tracking-tight">Không gian lập báo cáo</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">Chọn mẫu, lọc dữ liệu và xuất file</p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-5">
            <section className="space-y-2">
              <span className="text-[10.5px] uppercase font-semibold text-muted-foreground">Mẫu báo cáo</span>
              <div className="space-y-2">
                {REPORT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleTemplateChange(tpl.id)}
                    className={[
                      "w-full text-left p-3 rounded-xl border transition-all",
                      template === tpl.id
                        ? "border-primary/40 bg-primary/8 shadow-sm"
                        : "border-border/70 bg-card hover:border-border hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={[
                          "size-8 rounded-lg grid place-items-center shrink-0",
                          template === tpl.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {TEMPLATE_ICONS[tpl.id]}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold">{tpl.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tpl.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <span className="text-[10.5px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> Kỳ báo cáo
              </span>
              <div className="grid grid-cols-2 gap-2">
                <ConfigField label="Từ ngày">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => patchFilters({ dateFrom: e.target.value })}
                    className={inputCls}
                  />
                </ConfigField>
                <ConfigField label="Đến ngày">
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
                <span className="text-[10.5px] uppercase font-semibold text-muted-foreground">Bộ lọc dữ liệu</span>
                <ConfigField label="Ban bộ" icon={<Building2 className="size-3" />}>
                  <select value={filters.dept} onChange={(e) => patchFilters({ dept: e.target.value })} className={inputCls}>
                    {deptOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </ConfigField>
                <ConfigField label="Nhóm hàng">
                  <select value={filters.nhom} onChange={(e) => patchFilters({ nhom: e.target.value })} className={inputCls}>
                    {nhomOptions.map((n) => (
                      <option key={n} value={n}>
                        {n === "ALL" ? "Tất cả nhóm" : n}
                      </option>
                    ))}
                  </select>
                </ConfigField>
                <ConfigField label="Loại phiếu">
                  <select
                    value={filters.loai}
                    onChange={(e) => patchFilters({ loai: e.target.value as ReportFilters["loai"] })}
                    className={inputCls}
                  >
                    {REPORT_LOAI_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o === "ALL" ? "Tất cả loại phiếu" : VOUCHER_LABEL[o as VoucherType]}
                      </option>
                    ))}
                  </select>
                </ConfigField>
              </section>
            )}

            {template === "inventory" && (
              <ConfigField label="Nhóm hàng">
                <select value={filters.nhom} onChange={(e) => patchFilters({ nhom: e.target.value })} className={inputCls}>
                  {nhomOptions.map((n) => (
                    <option key={n} value={n}>
                      {n === "ALL" ? "Tất cả nhóm" : n}
                    </option>
                  ))}
                </select>
              </ConfigField>
            )}

            <ConfigField label="Tiêu đề báo cáo">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </ConfigField>
          </div>

          <div className="p-4 border-t border-border/70 bg-muted/20 space-y-2">
            <div className="text-[11px] text-muted-foreground">
              Người lập: <span className="font-medium text-foreground">{meta.preparedBy}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 rounded-lg border border-border bg-card text-[12px] font-medium hover:bg-muted flex items-center justify-center gap-1.5"
              >
                <Printer className="size-3.5" /> In / PDF
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isLoading}
                className="h-9 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary-hover flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="size-3.5" /> Excel
              </button>
            </div>
          </div>
        </aside>

        {/* —— Xem trước —— */}
        <main className="overflow-auto p-4 md:p-6 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground text-[13px]">
              <Loader2 className="size-4 animate-spin" /> Đang tải dữ liệu báo cáo…
            </div>
          ) : (
            <div
              id="report-print-area"
              className="report-print-area max-w-4xl mx-auto bg-white text-foreground rounded-2xl border border-border/70 shadow-[var(--shadow-mica)] p-8 md:p-10 space-y-6"
            >
              <ReportHeader meta={meta} template={template} />

              {template === "executive" && <ExecutivePreview summary={executive} />}
              {template === "transactions" && <TransactionsPreview lines={filteredLines} />}
              {template === "inventory" && <InventoryPreview rows={inventoryRows(vatTu, filters.nhom)} />}
              {template === "distribution" && (
                <DistributionPreview lines={filteredLines} summary={executive} />
              )}

              <ReportFooter meta={meta} lineCount={filteredLines.length} skuCount={vatTu.length} />
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

function ReportHeader({ meta, template }: { meta: ReportMeta; template: ReportTemplateId }) {
  const tpl = REPORT_TEMPLATES.find((t) => t.id === template);
  return (
    <header className="border-b border-border/60 pb-5">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Stockflow · VPP & BHLĐ</div>
      <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight mt-2 leading-tight">{meta.title}</h1>
      <p className="text-[13px] text-muted-foreground mt-1">{tpl?.description}</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
        <span>
          <span className="text-muted-foreground">Kỳ báo cáo:</span>{" "}
          <span className="font-semibold">{meta.periodLabel}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Người lập:</span>{" "}
          <span className="font-semibold">{meta.preparedBy}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Xuất lúc:</span>{" "}
          <span className="font-semibold">{meta.generatedAt}</span>
        </span>
      </div>
    </header>
  );
}

function ReportFooter({
  meta,
  lineCount,
  skuCount,
}: {
  meta: ReportMeta;
  lineCount: number;
  skuCount: number;
}) {
  return (
    <footer className="border-t border-border/60 pt-4 text-[11px] text-muted-foreground space-y-1">
      <p>
        Báo cáo được lập từ hệ thống Stockflow · {lineCount} dòng giao dịch trong kỳ · {skuCount} mã hàng trong danh mục.
      </p>
      <p className="italic">Tài liệu nội bộ — {meta.preparedBy} · {meta.generatedAt}</p>
    </footer>
  );
}

function ExecutivePreview({ summary }: { summary: ReturnType<typeof buildExecutiveSummary> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingDown className="size-4" />} label="Tổng nhập" value={fmtNum(summary.totalIn)} tone="info" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Tổng xuất" value={fmtNum(summary.totalOut)} tone="success" />
        <KpiCard icon={<PackageCheck className="size-4" />} label="Số phiếu" value={fmtNum(summary.voucherCount)} hint={`${summary.lineCount} dòng`} tone="primary" />
        <KpiCard icon={<Building2 className="size-4" />} label="Ban bộ phát sinh" value={`${fmtNum(summary.deptCount)}/${fmtNum(summary.byDept.length)}`} hint="có giao dịch trong kỳ" tone="warning" />
      </div>

      {(summary.lowStockCount > 0 || summary.quotaAlertCount > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 flex gap-3">
          <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-[12.5px]">
            <div className="font-semibold text-amber-900">Điểm cần lưu ý</div>
            <ul className="mt-1 space-y-0.5 text-amber-900/90">
              {summary.lowStockCount > 0 && (
                <li>
                  {summary.lowStockCount} mặt hàng đang ở hoặc dưới ngưỡng tồn tối thiểu
                </li>
              )}
              {summary.quotaAlertCount > 0 && (
                <li>{summary.quotaAlertCount} nhân viên tiêu hao định mức ≥ 75% trong tháng</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-[14px] font-semibold mb-3">Top hàng luân chuyển</h2>
        <ReportTable
          headers={["Mã hàng", "Tên vật tư", "Nhập", "Xuất", "ĐVT"]}
          rows={summary.topItems.map((r) => [r.maHang, r.name, fmtNum(r.qtyIn), fmtNum(r.qtyOut), r.unit])}
        />
      </section>

      <section>
        <h2 className="text-[14px] font-semibold mb-3">Luân chuyển theo ban bộ</h2>
        <ReportTable
          headers={["Mã", "Ban bộ", "Nhập", "Xuất", "Dòng"]}
          rows={summary.byDept.map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            fmtNum(d.qtyIn),
            fmtNum(d.qtyOut),
            d.lineCount > 0 ? fmtNum(d.lineCount) : "—",
          ])}
          dimZero={(row) => row[4] === "—"}
        />
      </section>
    </div>
  );
}

function TransactionsPreview({ lines }: { lines: ReportLineRow[] }) {
  return (
    <section>
      <h2 className="text-[14px] font-semibold mb-3">Chi tiết giao dịch ({fmtNum(lines.length)} dòng)</h2>
      {lines.length === 0 ? (
        <EmptyReport hint="Không có giao dịch trong kỳ đã chọn." />
      ) : (
        <ReportTable
          headers={["Phiếu", "Loại", "Ngày", "Ban bộ", "Người nhận", "Mã hàng", "SL"]}
          rows={lines.map((l) => [
            l.soPhieu,
            VOUCHER_LABEL[l.loaiPhieu as VoucherType] ?? l.loaiPhieu,
            l.ngayLap.split(",")[0] ?? l.ngayLap,
            l.maBoPhan ? formatBoPhanLabel({ maBoPhan: l.maBoPhan, tenBoPhan: l.tenBoPhan ?? l.maBoPhan }) : (l.tenBoPhan ?? "—"),
            l.recipient,
            l.maHang,
            fmtNum(l.soLuong),
          ])}
          compact
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
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={<Package className="size-4" />} label="Mã hàng" value={fmtNum(rows.length)} tone="primary" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Giá trị tồn" value={fmtMoney(totalValue)} tone="success" />
        <KpiCard icon={<AlertTriangle className="size-4" />} label="Sắp hết" value={fmtNum(lowCount)} tone="warning" />
      </div>
      <ReportTable
        headers={["Mã", "Tên vật tư", "Nhóm", "Tồn", "Min", "Đơn giá", "Giá trị", "TT"]}
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
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={<TrendingUp className="size-4" />} label="Tổng xuất / thu hồi" value={fmtNum(summary.totalOut)} tone="success" />
        <KpiCard icon={<PackageCheck className="size-4" />} label="Số phiếu" value={fmtNum(summary.voucherCount)} tone="primary" />
      </div>
      <section>
        <h2 className="text-[14px] font-semibold mb-3">Theo ban bộ</h2>
        <ReportTable
          headers={["Mã", "Ban bộ", "Xuất / thu hồi", "Dòng"]}
          rows={summary.byDept.map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            fmtNum(d.qtyOut),
            d.lineCount > 0 ? fmtNum(d.lineCount) : "—",
          ])}
          dimZero={(row) => row[3] === "—"}
        />
      </section>
      <section>
        <h2 className="text-[14px] font-semibold mb-3">Theo mã hàng</h2>
        <ReportTable
          headers={["Mã hàng", "Tên", "Nhóm", "Số lượng", "ĐVT"]}
          rows={summary.topItems.map((r) => [r.maHang, r.name, r.nhom ?? "—", fmtNum(r.qtyOut), r.unit])}
        />
      </section>
      <section>
        <h2 className="text-[14px] font-semibold mb-3">Chi tiết ({fmtNum(lines.length)} dòng)</h2>
        {lines.length === 0 ? (
          <EmptyReport hint="Không có phiếu cấp phát trong kỳ." />
        ) : (
          <ReportTable
            headers={["Phiếu", "Loại", "Ngày", "Ban bộ", "Người nhận", "Mã", "SL"]}
            rows={lines.slice(0, 50).map((l) => [
              l.soPhieu,
              VOUCHER_LABEL[l.loaiPhieu as VoucherType] ?? l.loaiPhieu,
              l.ngayLap.split(",")[0] ?? l.ngayLap,
              l.maBoPhan ? formatBoPhanLabel({ maBoPhan: l.maBoPhan, tenBoPhan: l.tenBoPhan ?? l.maBoPhan }) : (l.tenBoPhan ?? "—"),
              l.recipient,
              l.maHang,
              fmtNum(l.soLuong),
            ])}
            compact
          />
        )}
        {lines.length > 50 && (
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Hiển thị 50/{lines.length} dòng — xuất Excel để xem đầy đủ.
          </p>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success-foreground/90",
    warning: "bg-warning/12 text-warning-foreground/90",
    info: "bg-info/12 text-info",
  };
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="flex justify-between items-start">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={`size-7 rounded-md grid place-items-center ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="mt-1.5 text-[18px] font-semibold tabular-nums leading-none">{value}</div>
      {hint && <div className="text-[10.5px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  compact,
  dimZero,
}: {
  headers: string[];
  rows: (string | number)[][];
  compact?: boolean;
  dimZero?: (row: (string | number)[]) => boolean;
}) {
  const cellPy = compact ? "py-1.5" : "py-2";
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground text-left">
            {headers.map((h) => (
              <th key={h} className={`px-3 ${cellPy} text-[10px] uppercase font-semibold whitespace-nowrap`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={[
                "border-t border-border/50",
                dimZero?.(row) ? "text-muted-foreground/60" : "",
              ].join(" ")}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={[
                    `px-3 ${cellPy}`,
                    j === 0 ? "font-mono text-[11px] text-primary" : "",
                    j === row.length - 1 && typeof cell === "string" && cell === "⚠" ? "text-amber-600 font-bold" : "",
                  ].join(" ")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyReport({ hint }: { hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center text-[13px] text-muted-foreground">
      {hint}
    </div>
  );
}
