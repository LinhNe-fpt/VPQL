import type { ReportMeta, ReportTemplateId } from "@/lib/report-workspace";
import {
  reportBi,
  reportTemplateBi,
  REPORT_BI,
  REPORT_TEMPLATE_BI,
} from "@/lib/report-i18n";

export function ReportDocumentHeader({
  meta,
  template,
  docRef,
}: {
  meta: ReportMeta;
  template: ReportTemplateId;
  docRef?: string;
}) {
  const tplBi = REPORT_TEMPLATE_BI[template];
  return (
    <header className="report-doc-header border-b border-border/60 pb-5 print:border-black/30 print:pb-4">
      <div className="flex items-start justify-between gap-4 print:items-center">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold print:text-[8pt] print:text-[#444]">
          {reportBi("brand")}
        </div>
        {docRef && (
          <div className="report-internal-stamp hidden print:block shrink-0">
            {reportBi("internalDoc")} · {docRef}
          </div>
        )}
      </div>
      <h1 className="text-[24px] md:text-[28px] font-semibold tracking-tight mt-2 leading-tight print:mt-1.5">
        {meta.title}
      </h1>
      <p className="subtitle text-[13px] text-muted-foreground mt-1 print:text-[9.5pt]">
        {reportTemplateBi(template, "description")}
      </p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[12.5px] print:mt-3 print:text-[9pt]">
        <div className="space-y-0.5">
          <p>
            <span className="text-muted-foreground print:text-[#555]">{reportBi("period")}:</span>{" "}
            <span className="font-semibold">{meta.periodLabel}</span>
          </p>
          <p>
            <span className="text-muted-foreground print:text-[#555]">{reportBi("exportedAt")}:</span>{" "}
            <span className="font-semibold">{meta.generatedAt}</span>
          </p>
        </div>
        <div className="sm:text-right print:text-right">
          <p>
            <span className="text-muted-foreground print:text-[#555]">{reportBi("preparedBy")}:</span>{" "}
            <span className="font-semibold">{meta.preparedBy}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 print:text-[8pt] print:text-[#555]">
            {reportBi("template")}: {tplBi.label.vi} / {tplBi.label.ko}
          </p>
        </div>
      </div>
    </header>
  );
}

export function ReportDocumentFooter({
  meta,
  lineCount,
  skuCount,
  showSignatures = true,
}: {
  meta: ReportMeta;
  lineCount: number;
  skuCount: number;
  showSignatures?: boolean;
}) {
  return (
    <footer className="report-doc-footer border-t border-border/60 pt-4 text-[11px] text-muted-foreground space-y-2 print:space-y-1">
      <p>
        {reportBi("footerSummary")} · {lineCount} {REPORT_BI.linesInPeriod.vi} / {REPORT_BI.linesInPeriod.ko} ·{" "}
        {skuCount} {REPORT_BI.skusInCatalog.vi} / {REPORT_BI.skusInCatalog.ko}.
      </p>
      <p className="italic print:not-italic">{reportBi("footerInternal")}</p>
      {showSignatures && (
        <div className="report-signature-block hidden print:grid">
          <div>
            <p className="text-[#555]">{reportBi("sigPreparer")}</p>
            <p className="sig-line">{meta.preparedBy}</p>
          </div>
          <div>
            <p className="text-[#555]">{reportBi("sigApprover")}</p>
            <p className="sig-line">&nbsp;</p>
          </div>
          <div>
            <p className="text-[#555]">{reportBi("sigKeeper")}</p>
            <p className="sig-line">&nbsp;</p>
          </div>
        </div>
      )}
      <p className="text-[10px] print:text-[7.5pt] print:text-[#666]">
        {meta.preparedBy} · {meta.generatedAt}
      </p>
    </footer>
  );
}

export function ReportKpiGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const gridCls =
    cols === 4
      ? "grid grid-cols-2 md:grid-cols-4 gap-3"
      : cols === 2
        ? "grid grid-cols-2 gap-3"
        : "grid grid-cols-2 md:grid-cols-3 gap-3";
  return <div className={`report-kpi-grid ${gridCls}`}>{children}</div>;
}

export function ReportKpiCard({
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
    <div className="report-kpi-card rounded-xl border border-border/60 p-3 print:rounded">
      <div className="flex justify-between items-start gap-2">
        <span className="text-[11px] text-muted-foreground print:text-[8pt] print:text-[#555] leading-snug">{label}</span>
        <span className={`kpi-icon size-7 rounded-md grid place-items-center shrink-0 ${tones[tone]}`}>{icon}</span>
      </div>
      <div className="kpi-value mt-1.5 text-[18px] font-semibold tabular-nums leading-none print:mt-1">{value}</div>
      {hint && <div className="text-[10.5px] text-muted-foreground mt-1 print:text-[7.5pt]">{hint}</div>}
    </div>
  );
}

export function ReportSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="report-section-title text-[14px] font-semibold mb-3 print:mb-0">{children}</h2>;
}

export function ReportAlertBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="report-alert-box rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 flex gap-3 print:p-3">
      <div className="text-[12.5px] print:text-[9pt]">
        <div className="font-semibold text-amber-900 print:text-[#78350f]">{title}</div>
        <ul className="mt-1 space-y-0.5 text-amber-900/90 print:text-[#78350f]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type CellAlign = "left" | "center" | "right";

export function ReportDataTable({
  headers,
  rows,
  compact,
  dimZero,
  alignments,
  monoColumns = [0],
  numericColumns,
}: {
  headers: string[];
  rows: (string | number)[][];
  compact?: boolean;
  dimZero?: (row: (string | number)[]) => boolean;
  alignments?: CellAlign[];
  monoColumns?: number[];
  numericColumns?: number[];
}) {
  const cellPy = compact ? "py-1.5" : "py-2";
  const defaultAlign = (j: number): CellAlign => {
    if (alignments?.[j]) return alignments[j];
    if (numericColumns?.includes(j)) return "right";
    return "left";
  };

  return (
    <div className="report-table-wrap overflow-x-auto rounded-lg border border-border/60 print:border-none print:rounded-none">
      <table className="report-data-table w-full text-[12px]">
        <thead>
          <tr className="bg-[#d9eaf7]/80 text-muted-foreground text-left print:bg-[#d9eaf7]">
            {headers.map((h, j) => (
              <th
                key={`${h}-${j}`}
                className={[
                  `px-3 ${cellPy} text-[10px] uppercase font-semibold whitespace-nowrap`,
                  defaultAlign(j) === "right" ? "text-right" : defaultAlign(j) === "center" ? "text-center" : "",
                ].join(" ")}
              >
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
                "border-t border-border/50 print:border-none",
                dimZero?.(row) ? "text-muted-foreground/60" : "",
              ].join(" ")}
            >
              {row.map((cell, j) => {
                const align = defaultAlign(j);
                const isWarn = j === row.length - 1 && typeof cell === "string" && cell === "⚠";
                return (
                  <td
                    key={j}
                    className={[
                      `px-3 ${cellPy}`,
                      align === "right" ? "num text-right tabular-nums" : align === "center" ? "text-center" : "",
                      monoColumns.includes(j) ? "mono font-mono text-[11px] text-primary" : "",
                      isWarn ? "warn text-amber-600 font-bold" : "",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportEmptyState({ hint }: { hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center text-[13px] text-muted-foreground print:border-black/30 print:py-6 print:text-[9pt]">
      {hint}
    </div>
  );
}

export function buildReportDocRef(template: ReportTemplateId): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `BC-${template.toUpperCase().slice(0, 4)}-${stamp}`;
}
