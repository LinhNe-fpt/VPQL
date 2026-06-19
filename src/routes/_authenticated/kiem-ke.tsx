import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  Loader2,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { Topbar } from "@/components/topbar";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { getIssuerName, useClientSession } from "@/lib/auth";
import {
  createPhieuKiemKe,
  getBienDongLedger,
  getKiemKeData,
} from "@/lib/api/kiemke.functions";
import {
  aggregateByNhom,
  buildCountRows,
  exportKiemKeExcel,
  filterBienDong,
  fmtMoney,
  fmtNum,
  monthStartInput,
  summarizeBienDong,
  summarizeStock,
  todayInput,
  type KiemKeFilters,
} from "@/lib/kiem-ke-workspace";
import { VOUCHER_LABEL } from "@/lib/types/vpp";

export const Route = createFileRoute("/_authenticated/kiem-ke")({
  head: () => ({
    meta: [
      { title: "Kiểm kê kho – Stockflow" },
      { name: "description", content: "Kiểm kê tồn kho, sổ biến động và báo cáo chi tiết." },
    ],
  }),
  component: KiemKePage,
});

const QUERY_KEY = ["kiem-ke"] as const;

type TabId = "count" | "ledger" | "report";

function KiemKePage() {
  const { t } = useTranslation();
  const session = useClientSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("count");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getKiemKeData(),
  });

  const vatTu = data?.vatTu ?? [];
  const kiemKeVouchers = data?.kiemKeVouchers ?? [];

  const [filters, setFilters] = useState<KiemKeFilters>({
    dateFrom: monthStartInput(),
    dateTo: todayInput(),
    nhom: "ALL",
    q: "",
  });

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countQ, setCountQ] = useState("");
  const [countNhom, setCountNhom] = useState("ALL");
  const [ghiChu, setGhiChu] = useState("");
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);

  useEffect(() => {
    if (!vatTu.length) return;
    setCounts((prev) => {
      const next = { ...prev };
      for (const v of vatTu) {
        if (next[v.maHang] === undefined) next[v.maHang] = v.soLuongTon;
      }
      return next;
    });
  }, [vatTu]);

  const { data: ledger = [], isFetching: ledgerLoading } = useQuery({
    queryKey: ["bien-dong", filters.dateFrom, filters.dateTo, filters.nhom, filters.q],
    queryFn: () =>
      getBienDongLedger({
        data: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          nhomHang: filters.nhom === "ALL" ? undefined : filters.nhom,
          maHang: filters.q.trim() || undefined,
        },
      }),
    enabled: tab !== "count",
  });

  const filteredLedger = useMemo(() => filterBienDong(ledger, filters), [ledger, filters]);
  const movSummary = useMemo(() => summarizeBienDong(filteredLedger), [filteredLedger]);
  const stockSummary = useMemo(() => summarizeStock(vatTu), [vatTu]);

  const nhomOptions = useMemo(() => {
    const set = new Set(vatTu.map((v) => v.nhomHang).filter(Boolean) as string[]);
    return ["ALL", ...Array.from(set).sort()];
  }, [vatTu]);

  const countRows = useMemo(() => {
    const filtered = vatTu.filter((v) => {
      if (countNhom !== "ALL" && v.nhomHang !== countNhom) return false;
      if (countQ && !`${v.maHang} ${v.tenSanPham}`.toLowerCase().includes(countQ.toLowerCase())) return false;
      return true;
    });
    return buildCountRows(filtered, counts, showVarianceOnly);
  }, [vatTu, counts, countNhom, countQ, showVarianceOnly]);

  const varianceRows = useMemo(
    () => buildCountRows(vatTu, counts, true),
    [vatTu, counts],
  );

  const nhomAgg = useMemo(
    () => aggregateByNhom(vatTu, filteredLedger),
    [vatTu, filteredLedger],
  );

  const mutation = useMutation({
    mutationFn: () =>
      createPhieuKiemKe({
        data: {
          nguoiLap: getIssuerName(session),
          ghiChu: ghiChu || undefined,
          lines: varianceRows.map((r) => ({
            maHang: r.maHang,
            soLuongThucTe: r.soLuongThucTe,
          })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`Tạo phiếu kiểm kê ${result.soPhieu} thành công`);
      setGhiChu("");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["bien-dong"] });
      queryClient.invalidateQueries({ queryKey: ["vat-tu"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không tạo được phiếu kiểm kê");
    },
  });

  function resetCounts() {
    const next: Record<string, number> = {};
    for (const v of vatTu) next[v.maHang] = v.soLuongTon;
    setCounts(next);
  }

  function exportExcel() {
    exportKiemKeExcel({
      title: "Báo cáo kiểm kê kho chi tiết",
      periodLabel: `${filters.dateFrom} → ${filters.dateTo}`,
      preparedBy: getIssuerName(session),
      countRows: buildCountRows(vatTu, counts, false),
      movements: filteredLedger,
      vatTu,
      vouchers: kiemKeVouchers,
    });
    toast.success("Đã xuất file Excel");
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "count", label: t("pages.kiemKe.tabCount"), icon: <ClipboardCheck className="size-3.5" /> },
    { id: "ledger", label: t("pages.kiemKe.tabLedger"), icon: <History className="size-3.5" /> },
    { id: "report", label: t("pages.kiemKe.tabReport"), icon: <FileSpreadsheet className="size-3.5" /> },
  ];

  return (
    <>
      <Topbar title={t("pages.kiemKe.title")} subtitle={t("pages.kiemKe.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStat
            label={t("pages.kiemKe.stockValue")}
            value={fmtMoney(stockSummary.stockValue)}
            hint={`${fmtNum(stockSummary.itemCount)} mã hàng`}
          />
          <MiniStat
            label={t("pages.kiemKe.periodIn")}
            value={fmtMoney(movSummary.totalInValue)}
            hint={`${fmtNum(movSummary.totalInQty)} đơn vị nhập`}
            tone="in"
          />
          <MiniStat
            label={t("pages.kiemKe.periodOut")}
            value={fmtMoney(movSummary.totalOutValue)}
            hint={`${fmtNum(movSummary.totalOutQty)} đơn vị xuất`}
            tone="out"
          />
          <MiniStat
            label={t("pages.kiemKe.movements")}
            value={fmtNum(movSummary.movementCount)}
            hint={t("pages.kiemKe.movementsHint")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "h-9 px-3.5 rounded-lg border text-[12.5px] font-medium flex items-center gap-1.5 transition-colors",
                tab === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={exportExcel}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-lg border border-border bg-card text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
          >
            <FileSpreadsheet className="size-3.5" />
            {t("pages.kiemKe.exportExcel")}
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-destructive text-[13px] flex gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {error instanceof Error ? error.message : t("pages.kiemKe.loadError")}
          </div>
        )}

        {!isLoading && !isError && tab === "count" && (
          <CountTab
            countRows={countRows}
            varianceCount={varianceRows.length}
            countQ={countQ}
            setCountQ={setCountQ}
            countNhom={countNhom}
            setCountNhom={setCountNhom}
            nhomOptions={nhomOptions}
            showVarianceOnly={showVarianceOnly}
            setShowVarianceOnly={setShowVarianceOnly}
            counts={counts}
            setCounts={setCounts}
            ghiChu={ghiChu}
            setGhiChu={setGhiChu}
            onReset={resetCounts}
            onSubmit={() => mutation.mutate()}
            submitting={mutation.isPending}
            kiemKeVouchers={kiemKeVouchers}
          />
        )}

        {!isLoading && !isError && tab === "ledger" && (
          <LedgerTab
            filters={filters}
            setFilters={setFilters}
            nhomOptions={nhomOptions}
            rows={filteredLedger}
            loading={ledgerLoading}
          />
        )}

        {!isLoading && !isError && tab === "report" && (
          <ReportTab
            filters={filters}
            setFilters={setFilters}
            nhomOptions={nhomOptions}
            nhomAgg={nhomAgg}
            movSummary={movSummary}
            stockSummary={stockSummary}
            varianceRows={varianceRows}
          />
        )}
      </div>
    </>
  );
}

function CountTab({
  countRows,
  varianceCount,
  countQ,
  setCountQ,
  countNhom,
  setCountNhom,
  nhomOptions,
  showVarianceOnly,
  setShowVarianceOnly,
  counts,
  setCounts,
  ghiChu,
  setGhiChu,
  onReset,
  onSubmit,
  submitting,
  kiemKeVouchers,
}: {
  countRows: ReturnType<typeof buildCountRows>;
  varianceCount: number;
  countQ: string;
  setCountQ: (v: string) => void;
  countNhom: string;
  setCountNhom: (v: string) => void;
  nhomOptions: string[];
  showVarianceOnly: boolean;
  setShowVarianceOnly: (v: boolean) => void;
  counts: Record<string, number>;
  setCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ghiChu: string;
  setGhiChu: (v: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  submitting: boolean;
  kiemKeVouchers: { soPhieu: string; ngayLap: string; lineCount: number; totalQty: number; ghiChu: string | null }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="card-elevated p-3.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[220px]">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={countQ}
            onChange={(e) => setCountQ(e.target.value)}
            placeholder={t("pages.kiemKe.searchItem")}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
        <select
          value={countNhom}
          onChange={(e) => setCountNhom(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-[12.5px]"
        >
          {nhomOptions.map((n) => (
            <option key={n} value={n}>{n === "ALL" ? t("pages.kiemKe.allGroups") : n}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showVarianceOnly}
            onChange={(e) => setShowVarianceOnly(e.target.checked)}
            className="rounded"
          />
          {t("pages.kiemKe.varianceOnly")}
        </label>
        <button type="button" onClick={onReset} className="h-9 px-3 rounded-lg border border-border text-[12px] hover:bg-muted">
          {t("pages.kiemKe.resetCounts")}
        </button>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 text-muted-foreground text-[10.5px] uppercase">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">{t("pages.kiemKe.colItem")}</th>
                <th className="px-2 py-2.5 text-right font-semibold w-24">{t("pages.kiemKe.colSystem")}</th>
                <th className="px-2 py-2.5 text-right font-semibold w-28">{t("pages.kiemKe.colActual")}</th>
                <th className="px-2 py-2.5 text-right font-semibold w-24">{t("pages.kiemKe.colVariance")}</th>
                <th className="px-2 py-2.5 text-right font-semibold w-32">{t("pages.kiemKe.colValue")}</th>
              </tr>
            </thead>
            <tbody>
              {countRows.map((row) => (
                <tr key={row.maHang} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <VatTuThumbnail maHang={row.maHang} tenSanPham={row.tenSanPham} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.tenSanPham}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{row.maHang} · {row.donViTinh}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{fmtNum(row.soLuongHeThong)}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={counts[row.maHang] ?? row.soLuongHeThong}
                      onChange={(e) =>
                        setCounts((prev) => ({
                          ...prev,
                          [row.maHang]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full h-8 px-2 rounded-md border border-border text-right font-semibold outline-none focus:ring-2 focus:ring-ring/25"
                    />
                  </td>
                  <td
                    className={[
                      "px-2 py-2 text-right font-semibold",
                      row.chenhLech > 0 ? "text-emerald-600" : row.chenhLech < 0 ? "text-destructive" : "",
                    ].join(" ")}
                  >
                    {row.chenhLech > 0 ? "+" : ""}
                    {fmtNum(row.chenhLech)}
                  </td>
                  <td className="px-2 py-2 text-right text-muted-foreground">{fmtMoney(row.giaTriTon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-elevated p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px]">
            <span className="text-muted-foreground">{t("pages.kiemKe.varianceLines")}: </span>
            <span className="font-semibold">{fmtNum(varianceCount)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={varianceCount === 0 || submitting}
              onClick={onSubmit}
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t("pages.kiemKe.postAdjustment")}
            </button>
          </div>
        </div>
        <textarea
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          rows={2}
          placeholder={t("pages.kiemKe.notePh")}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] outline-none resize-none"
        />
      </div>

      {kiemKeVouchers.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="text-[13px] font-semibold mb-3">{t("pages.kiemKe.recentVouchers")}</h3>
          <div className="space-y-2">
            {kiemKeVouchers.slice(0, 8).map((v) => (
              <div key={v.soPhieu} className="flex items-center justify-between text-[12px] py-1.5 border-b border-border/50 last:border-0">
                <span className="font-mono font-semibold">{v.soPhieu}</span>
                <span className="text-muted-foreground">{v.ngayLap}</span>
                <span>{fmtNum(v.lineCount)} dòng · {fmtNum(v.totalQty)} SL</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerTab({
  filters,
  setFilters,
  nhomOptions,
  rows,
  loading,
}: {
  filters: KiemKeFilters;
  setFilters: React.Dispatch<React.SetStateAction<KiemKeFilters>>;
  nhomOptions: string[];
  rows: import("@/lib/types/vpp").BienDongRow[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} setFilters={setFilters} nhomOptions={nhomOptions} />

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-4">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">{t("pages.kiemKe.colDate")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("pages.kiemKe.colVoucher")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("pages.kiemKe.colType")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("pages.kiemKe.colItem")}</th>
                <th className="px-2 py-2 text-center font-semibold w-16">{t("pages.kiemKe.colDir")}</th>
                <th className="px-2 py-2 text-right font-semibold w-20">{t("pages.kiemKe.colQty")}</th>
                <th className="px-2 py-2 text-right font-semibold w-24">{t("pages.kiemKe.colBalance")}</th>
                <th className="px-2 py-2 text-right font-semibold w-28">{t("pages.kiemKe.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    {t("pages.kiemKe.emptyLedger")}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.ngayGio}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{r.soPhieu}</td>
                  <td className="px-3 py-2 text-[11px]">
                    {VOUCHER_LABEL[r.loaiPhieu as keyof typeof VOUCHER_LABEL] ?? r.loaiPhieu}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.tenSanPham}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{r.maHang}</div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {r.loaiBienDong === "TANG" ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[11px] font-semibold">
                        <TrendingUp className="size-3" /> +
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold">
                        <TrendingDown className="size-3" /> −
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">{fmtNum(r.soLuong)}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">{fmtNum(r.tonKhoSau)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(r.giaTri)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportTab({
  filters,
  setFilters,
  nhomOptions,
  nhomAgg,
  movSummary,
  stockSummary,
  varianceRows,
}: {
  filters: KiemKeFilters;
  setFilters: React.Dispatch<React.SetStateAction<KiemKeFilters>>;
  nhomOptions: string[];
  nhomAgg: ReturnType<typeof aggregateByNhom>;
  movSummary: ReturnType<typeof summarizeBienDong>;
  stockSummary: ReturnType<typeof summarizeStock>;
  varianceRows: ReturnType<typeof buildCountRows>;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} setFilters={setFilters} nhomOptions={nhomOptions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-elevated p-4">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2">
            <Warehouse className="size-4 text-primary" />
            {t("pages.kiemKe.reportStock")}
          </h3>
          <dl className="space-y-2 text-[12.5px]">
            <Row label={t("pages.kiemKe.itemCount")} value={fmtNum(stockSummary.itemCount)} />
            <Row label={t("pages.kiemKe.stockValue")} value={fmtMoney(stockSummary.stockValue)} />
            <Row label={t("pages.kiemKe.periodIn")} value={`${fmtNum(movSummary.totalInQty)} · ${fmtMoney(movSummary.totalInValue)}`} />
            <Row label={t("pages.kiemKe.periodOut")} value={`${fmtNum(movSummary.totalOutQty)} · ${fmtMoney(movSummary.totalOutValue)}`} />
            <Row label={t("pages.kiemKe.netFlow")} value={fmtMoney(movSummary.totalInValue - movSummary.totalOutValue)} />
          </dl>
        </div>

        <div className="card-elevated p-4">
          <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            {t("pages.kiemKe.reportVariance")}
          </h3>
          {varianceRows.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">{t("pages.kiemKe.noVariance")}</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {varianceRows.map((r) => (
                <div key={r.maHang} className="flex justify-between text-[12px] py-1 border-b border-border/40">
                  <span className="truncate pr-2">{r.tenSanPham}</span>
                  <span className={r.chenhLech < 0 ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>
                    {r.chenhLech > 0 ? "+" : ""}
                    {fmtNum(r.chenhLech)} · {fmtMoney(r.giaTriChenhLech)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="text-[13px] font-semibold">{t("pages.kiemKe.reportByGroup")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">{t("pages.kiemKe.colGroup")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("pages.kiemKe.colItems")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("pages.kiemKe.colStockQty")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("pages.kiemKe.colStockVal")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("pages.kiemKe.colInVal")}</th>
                <th className="px-2 py-2 text-right font-semibold">{t("pages.kiemKe.colOutVal")}</th>
              </tr>
            </thead>
            <tbody>
              {nhomAgg.map((r) => (
                <tr key={r.nhomHang} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{r.nhomHang}</td>
                  <td className="px-2 py-2 text-right">{fmtNum(r.itemCount)}</td>
                  <td className="px-2 py-2 text-right">{fmtNum(r.tonQty)}</td>
                  <td className="px-2 py-2 text-right">{fmtMoney(r.tonValue)}</td>
                  <td className="px-2 py-2 text-right text-emerald-700">{fmtMoney(r.nhapValue)}</td>
                  <td className="px-2 py-2 text-right text-destructive">{fmtMoney(r.xuatValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20 text-[12.5px] text-muted-foreground">
        <Package className="size-5 text-primary shrink-0 mt-0.5" />
        <p>
          {t("pages.kiemKe.reportHint")}{" "}
          <Link to="/transactions" className="text-primary font-medium hover:underline">
            {t("nav.transactions")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  nhomOptions,
}: {
  filters: KiemKeFilters;
  setFilters: React.Dispatch<React.SetStateAction<KiemKeFilters>>;
  nhomOptions: string[];
}) {
  const { t } = useTranslation();
  return (
    <div className="card-elevated p-3.5 flex flex-wrap items-end gap-3">
      <label className="text-[11px] text-muted-foreground">
        {t("pages.kiemKe.dateFrom")}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          className="mt-1 block h-9 px-3 rounded-lg border border-border bg-card text-[12.5px]"
        />
      </label>
      <label className="text-[11px] text-muted-foreground">
        {t("pages.kiemKe.dateTo")}
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          className="mt-1 block h-9 px-3 rounded-lg border border-border bg-card text-[12.5px]"
        />
      </label>
      <label className="text-[11px] text-muted-foreground">
        {t("pages.kiemKe.colGroup")}
        <select
          value={filters.nhom}
          onChange={(e) => setFilters((f) => ({ ...f, nhom: e.target.value }))}
          className="mt-1 block h-9 px-3 rounded-lg border border-border bg-card text-[12.5px] min-w-[140px]"
        >
          {nhomOptions.map((n) => (
            <option key={n} value={n}>{n === "ALL" ? t("pages.kiemKe.allGroups") : n}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[180px]">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder={t("pages.kiemKe.searchItem")}
          className="flex-1 bg-transparent outline-none text-[13px]"
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-right">{value}</dd>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "in" | "out";
}) {
  return (
    <div className="card-elevated p-4 fluid-in">
      <div className="text-[11.5px] text-muted-foreground font-medium">{label}</div>
      <div
        className={[
          "mt-1.5 text-[20px] font-semibold tracking-tight",
          tone === "in" ? "text-emerald-700" : tone === "out" ? "text-destructive" : "",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-muted-foreground">{hint}</div>
    </div>
  );
}
