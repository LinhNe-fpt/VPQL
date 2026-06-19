import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  HardHat,
  Loader2,
  Plus,
  Search,
  Shirt,
  User,
  Calendar,
} from "lucide-react";

import { Topbar } from "@/components/topbar";
import { CuocDoQuotaProgress } from "@/components/cuoc-do-quota-progress";
import { DongPhucCatalogGrid } from "@/components/dong-phuc-catalog-grid";
import { NhanVienManualFields } from "@/components/nhan-vien-manual-fields";
import { VoucherPrintButton, VoucherPrintHeader, VoucherPrintSignatures } from "@/components/voucher-print-actions";
import { VoucherPrintStyles } from "@/components/voucher-print-styles";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { formatBoPhanLabel } from "@/lib/bo-phan";
import { getIssuerName, useClientSession } from "@/lib/auth";
import { getBoPhanList, getNhanVienList } from "@/lib/api/master.functions";
import {
  createPhieuCuocDo,
  getCuocDoVatTuList,
  getCuocDoVoucherDetail,
  getCuocDoVoucherList,
} from "@/lib/api/cuocdo.functions";
import { cuocDoLoaiToPhieu, getCuocDoHangMuc, type CuocDoLoai } from "@/lib/cuoc-do";
import { DONG_PHUC_CATALOG_KEY } from "@/lib/dong-phuc-catalog";
import type { VatTuRow } from "@/lib/types/vpp";
import { VOUCHER_LABEL, type NhanVienRow, type VoucherSummary } from "@/lib/types/vpp";

export const Route = createFileRoute("/_authenticated/cuoc-do")({
  head: () => ({
    meta: [
      { title: "Phiếu cược đồ – Stockflow" },
      { name: "description", content: "Lập phiếu cấp cược đồ cho nhân viên và công nhân." },
    ],
  }),
  component: CuocDoPage,
});

const QUERY_KEYS = {
  list: ["cuoc-do-vouchers"] as const,
  vatTu: DONG_PHUC_CATALOG_KEY,
};

const TYPE_TONE: Record<string, string> = {
  XUAT_CUOC_NV: "bg-primary/12 text-primary border-primary/25",
  XUAT_CUOC_CN: "bg-primary/12 text-primary border-primary/25",
  XUAT_CUOC_PB: "bg-violet-500/12 text-violet-700 border-violet-500/25",
};

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function isCongNhanChucDanh(chucDanh: string | null | undefined): boolean {
  if (!chucDanh) return false;
  const cd = chucDanh.toLowerCase();
  return (
    cd.includes("công nhân") ||
    cd.includes("cong nhan") ||
    cd.includes("sản xuất") ||
    cd.includes("san xuat")
  );
}

function filterNhanVienForLoai(nhanVien: NhanVienRow[], loai: CuocDoLoai): NhanVienRow[] {
  if (loai === "PB") return nhanVien;
  if (loai === "CN") return nhanVien.filter((n) => isCongNhanChucDanh(n.chucDanh));
  return nhanVien.filter((n) => !isCongNhanChucDanh(n.chucDanh));
}

function CuocDoPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: vouchers = [], isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEYS.list,
    queryFn: () => getCuocDoVoucherList(),
  });

  const [selectedSoPhieu, setSelectedSoPhieu] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | CuocDoLoai>("ALL");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (vouchers.length && !selectedSoPhieu) {
      setSelectedSoPhieu(vouchers[0].soPhieu);
    }
  }, [vouchers, selectedSoPhieu]);

  const list = useMemo(() => {
    return vouchers.filter((v) => {
      if (filter === "NV" && v.loaiPhieu !== "XUAT_CUOC_NV") return false;
      if (filter === "CN" && v.loaiPhieu !== "XUAT_CUOC_CN") return false;
      if (filter === "PB" && v.loaiPhieu !== "XUAT_CUOC_PB") return false;
      if (q && !`${v.soPhieu} ${v.recipient} ${v.hoTen} ${v.tenBoPhan}`.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [vouchers, filter, q]);

  const selected = vouchers.find((v) => v.soPhieu === selectedSoPhieu) ?? list[0];

  function onCreated(soPhieu: string) {
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vatTu });
    queryClient.invalidateQueries({ queryKey: ["vat-tu"] });
    setSelectedSoPhieu(soPhieu);
  }

  return (
    <>
      <VoucherPrintStyles />
      <div className="no-print">
        <Topbar title={t("pages.cuocDo.title")} subtitle={t("pages.cuocDo.subtitle")} />
      </div>
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0 min-h-0 voucher-print-root">
        <div className="no-print flex flex-col border-r border-border/70 min-h-0 bg-background/40">
          <div className="p-4 space-y-3 border-b border-border/70">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border/70">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("pages.cuocDo.searchPlaceholder")}
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-hover transition-colors"
            >
              <Plus className="size-3.5" />
              {t("pages.cuocDo.newVoucher")}
            </button>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/60 w-fit flex-wrap">
              {([
                { id: "ALL" as const, label: t("pages.cuocDo.filterAll") },
                { id: "NV" as const, label: t("pages.cuocDo.filterNV") },
                { id: "CN" as const, label: t("pages.cuocDo.filterCN") },
                { id: "PB" as const, label: t("pages.cuocDo.filterPB") },
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={[
                    "px-2.5 h-7 rounded-md text-[12px] font-medium transition-all",
                    filter === item.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-[13px]">
                <Loader2 className="size-4 animate-spin" />
                {t("common.loading")}
              </div>
            )}
            {isError && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-[12.5px] text-destructive flex gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error instanceof Error ? error.message : t("pages.cuocDo.loadError")}</span>
              </div>
            )}
            {!isLoading && !isError && list.length === 0 && (
              <p className="text-center text-[13px] text-muted-foreground py-12">{t("pages.cuocDo.empty")}</p>
            )}
            {list.map((v, i) => (
              <VoucherListItem
                key={v.soPhieu}
                v={v}
                active={selected?.soPhieu === v.soPhieu}
                delay={i * 25}
                onSelect={() => setSelectedSoPhieu(v.soPhieu)}
              />
            ))}
          </div>
        </div>

        <div className="overflow-auto p-6 voucher-print-pane">
          {selected ? <VoucherDetailPanel soPhieu={selected.soPhieu} summary={selected} /> : (
            <div className="grid place-items-center h-full text-muted-foreground text-[13px]">
              {t("pages.cuocDo.selectHint")}
            </div>
          )}
        </div>
      </div>

      {showCreate && <NewCuocDoPanel onClose={() => setShowCreate(false)} onSuccess={onCreated} />}
    </>
  );
}

function VoucherListItem({
  v,
  active,
  delay,
  onSelect,
}: {
  v: VoucherSummary;
  active: boolean;
  delay: number;
  onSelect: () => void;
}) {
  const isCN = v.loaiPhieu === "XUAT_CUOC_CN";
  const isPB = v.loaiPhieu === "XUAT_CUOC_PB";
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      className={[
        "w-full text-left p-3.5 rounded-xl border transition-all duration-200 fluid-in",
        active
          ? "border-primary/40 bg-primary/6 shadow-sm"
          : "border-border/70 bg-card hover:border-border hover:bg-muted/30",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[12px] font-semibold text-foreground">{v.soPhieu}</div>
          <div className="mt-1 text-[13px] font-medium truncate">{v.recipient}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{v.ngayLap}</div>
        </div>
        <span
          className={[
            "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold",
            TYPE_TONE[v.loaiPhieu] ?? "",
          ].join(" ")}
        >
          {isPB ? <Building2 className="size-3" /> : isCN ? <HardHat className="size-3" /> : <Shirt className="size-3" />}
          {isPB ? "BP" : isCN ? "CN" : "NV"}
        </span>
      </div>
      {isPB && v.soNhanVienCap != null && (
        <p className="mt-1.5 text-[10.5px] text-muted-foreground">
          {fmt(v.soNhanVienCap)} NV · {v.lineCount} hạng mục
        </p>
      )}
    </button>
  );
}

function VoucherDetailPanel({ soPhieu, summary }: { soPhieu: string; summary: VoucherSummary }) {
  const { t } = useTranslation();
  const { data: detail, isLoading } = useQuery({
    queryKey: ["cuoc-do-detail", soPhieu],
    queryFn: () => getCuocDoVoucherDetail({ data: { soPhieu } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-[13px]">
        <Loader2 className="size-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="max-w-3xl space-y-5 voucher-print-area">
      <VoucherPrintHeader />
      <div className="flex items-start justify-between gap-3 flex-wrap print:block">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight font-mono">{detail.soPhieu}</h2>
            <span className={["px-2.5 py-0.5 rounded-md border text-[11px] font-semibold", TYPE_TONE[detail.loaiPhieu]].join(" ")}>
              {VOUCHER_LABEL[detail.loaiPhieu]}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">{detail.ngayLap}</p>
        </div>
        <div className="no-print">
          <VoucherPrintButton disabled={detail.lines.length === 0} label={t("pages.cuocDo.printVoucher")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border/70 bg-card print:border-black/20 print:bg-white">
        <Field
          icon={<User className="size-3.5" />}
          label={t("pages.cuocDo.recipient")}
          value={detail.recipient}
          sub={
            summary.tenBoPhan
              ? formatBoPhanLabel({ maBoPhan: summary.maBoPhan, tenBoPhan: summary.tenBoPhan })
              : undefined
          }
        />
        <Field icon={<Calendar className="size-3.5" />} label={t("pages.cuocDo.issuer")} value={detail.nguoiLap ?? "—"} />
        {summary.loaiPhieu === "XUAT_CUOC_PB" && summary.soNhanVienCap != null && (
          <div className="col-span-2 text-[12px] text-muted-foreground">
            {t("pages.cuocDo.headcountLabel")}: <span className="font-semibold text-foreground">{fmt(summary.soNhanVienCap)}</span>
            {summary.tenBoPhan && (
              <span> · {summary.tenBoPhan}</span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40 text-muted-foreground text-[10.5px] uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">{t("pages.cuocDo.colItem")}</th>
              <th className="px-4 py-2.5 text-right font-semibold w-24">{t("pages.cuocDo.colQty")}</th>
              <th className="px-4 py-2.5 text-right font-semibold w-28">{t("pages.cuocDo.colUnit")}</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.maHang} className="border-t border-border/60">
                <td className="px-4 py-2.5">
                  <div className="font-mono text-[11px] text-muted-foreground">{line.maHang}</div>
                  <div className="font-medium">{line.tenSanPham}</div>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmt(line.soLuong)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{line.donViTinh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.ghiChu && (
        <p className="text-[12.5px] text-muted-foreground">
          <span className="font-medium text-foreground">{t("pages.cuocDo.note")}: </span>
          {summary.ghiChu}
        </p>
      )}

      <VoucherPrintSignatures nguoiLap={detail.nguoiLap} recipient={detail.recipient} />
    </div>
  );
}

function Field({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">{icon} {label}</div>
      <div className="mt-1 text-[14px] font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground font-mono">{sub}</div>}
    </div>
  );
}

type DraftLine = { key: string; maHang: string; soLuong: number };

function newLineKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function NewCuocDoPanel({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (soPhieu: string) => void;
}) {
  const { t } = useTranslation();
  const session = useClientSession();
  const [loai, setLoai] = useState<CuocDoLoai>("NV");
  const [maNV, setMaNV] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [maBoPhan, setMaBoPhan] = useState("");
  const [soNhanVien, setSoNhanVien] = useState(1);
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const hangMucList = useMemo(() => getCuocDoHangMuc(loai), [loai]);

  const { data: vatTu = [] } = useQuery({ queryKey: QUERY_KEYS.vatTu, queryFn: () => getCuocDoVatTuList() });
  const { data: boPhan = [] } = useQuery({ queryKey: ["bo-phan"], queryFn: () => getBoPhanList() });
  const { data: nhanVienAll = [] } = useQuery({ queryKey: ["nhan-vien"], queryFn: () => getNhanVienList() });

  const nhanVien = useMemo(() => filterNhanVienForLoai(nhanVienAll, loai), [nhanVienAll, loai]);
  const matchedNv = nhanVienAll.find((n) => n.maNV.toUpperCase() === maNV.trim().toUpperCase());
  const hasValidMaNV = !!matchedNv;

  const isPb = loai === "PB";

  useEffect(() => {
    if (!isPb || soNhanVien < 1) return;
    setLines((prev) => prev.map((l) => ({ ...l, soLuong: soNhanVien })));
  }, [isPb, soNhanVien]);

  function lineQtyDefault() {
    return isPb ? Math.max(1, soNhanVien) : 1;
  }

  function addItemMaHang(maHang: string) {
    if (isPb && soNhanVien < 1) {
      toast.error(t("pages.cuocDo.needHeadcount"));
      return;
    }
    const item = vatTu.find((v) => v.maHang === maHang);
    if (!item) return;
    const qty = lineQtyDefault();
    setLines((prev) => {
      const existing = prev.find((l) => l.maHang === item.maHang);
      if (existing) {
        return prev.map((l) => (l.maHang === item.maHang ? { ...l, soLuong: qty } : l));
      }
      return [...prev, { key: newLineKey(), maHang: item.maHang, soLuong: qty }];
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      createPhieuCuocDo({
        data: {
          loaiPhieu: cuocDoLoaiToPhieu(loai),
          nguoiLap: getIssuerName(session),
          hoTenNguoiNhan: isPb ? undefined : hoTen.trim(),
          maNV: isPb ? undefined : maNV.trim() || undefined,
          maBoPhan,
          soNhanVien: isPb ? soNhanVien : undefined,
          ghiChu: ghiChu || undefined,
          lines: lines.map((l) => ({ maHang: l.maHang, soLuong: l.soLuong })),
        },
      }),
    onSuccess: (result) => {
      toast.success(t("pages.cuocDo.createSuccess", { soPhieu: result.soPhieu }));
      onSuccess(result.soPhieu);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("pages.cuocDo.createError"));
    },
  });

  function updateQty(key: string, soLuong: number) {
    if (isPb) return;
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, soLuong: Math.max(0, soLuong) } : l))
        .filter((l) => l.soLuong > 0),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function switchLoai(type: CuocDoLoai) {
    setLoai(type);
    setLines([]);
    setMaNV("");
    setHoTen("");
    setMaBoPhan("");
    if (type === "PB") {
      setSoNhanVien(1);
    } else {
      setSoNhanVien(1);
    }
  }

  function applyNhanVien(code: string, ten?: string, boPhanCode?: string | null) {
    setMaNV(code);
    if (ten) setHoTen(ten);
    if (boPhanCode) setMaBoPhan(boPhanCode);
  }

  const canSubmit =
    lines.length > 0 &&
    !mutation.isPending &&
    (isPb ? maBoPhan && soNhanVien > 0 : !!hoTen.trim() && !!maBoPhan);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[540px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{t("pages.cuocDo.panelTitle")}</h2>
            <p className="text-[11.5px] text-muted-foreground">{t("pages.cuocDo.panelSubtitle")}</p>
          </div>
          <button type="button" onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <Group label={t("pages.cuocDo.issueType")}>
            <div className="grid grid-cols-3 gap-2">
              {(["NV", "CN", "PB"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => switchLoai(type)}
                  className={[
                    "px-2 py-3 rounded-lg border text-[11.5px] font-medium text-left transition-all flex flex-col items-start gap-1.5",
                    loai === type
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border bg-card hover:bg-muted",
                  ].join(" ")}
                >
                  {type === "NV" ? <Shirt className="size-4" /> : type === "CN" ? <HardHat className="size-4" /> : <Building2 className="size-4" />}
                  {type === "NV" ? t("pages.cuocDo.filterNV") : type === "CN" ? t("pages.cuocDo.filterCN") : t("pages.cuocDo.filterPB")}
                </button>
              ))}
            </div>
          </Group>

          {isPb ? (
            <Group label={t("pages.cuocDo.deptSection")}>
              <select
                value={maBoPhan}
                onChange={(e) => setMaBoPhan(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-ring/25"
              >
                <option value="">{t("pages.cuocDo.pickDept")}</option>
                {boPhan.map((bp) => (
                  <option key={bp.id} value={bp.maBoPhan ?? ""}>
                    {formatBoPhanLabel(bp)}
                  </option>
                ))}
              </select>
              <div className="mt-3">
                <label className="text-[11px] text-muted-foreground font-medium">{t("pages.cuocDo.headcount")}</label>
                <input
                  type="number"
                  min={1}
                  value={soNhanVien}
                  onChange={(e) => setSoNhanVien(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] font-semibold outline-none focus:ring-2 focus:ring-ring/25"
                />
                <p className="mt-1.5 text-[10.5px] text-muted-foreground">{t("pages.cuocDo.headcountHint")}</p>
              </div>
              {lines.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-violet-500/8 border border-violet-500/20 text-[12px]">
                  {t("pages.cuocDo.deptSummary", {
                    count: soNhanVien,
                    items: lines.length,
                    total: lines.reduce((s, l) => s + l.soLuong, 0),
                  })}
                </div>
              )}
            </Group>
          ) : (
            <Group label={t("pages.cuocDo.recipientManual")}>
              <NhanVienManualFields
                listIdPrefix="cuoc-do"
                nhanVien={nhanVien}
                maNV={maNV}
                hoTen={hoTen}
                maNVLabel={`${t("pages.cuocDo.maNVLabel")} (${t("pages.cuocDo.maNVOptional")})`}
                hoTenLabel={t("pages.cuocDo.recipientNamePh").replace(" *", "")}
                hoTenPlaceholder={t("pages.cuocDo.recipientNamePh")}
                onMaNVChange={(code, ten) => {
                  const hit = nhanVienAll.find((n) => n.maNV.toUpperCase() === code.trim().toUpperCase());
                  applyNhanVien(code, ten ?? hit?.hoTen, hit?.maBoPhan ?? undefined);
                }}
                onHoTenChange={(ten, code) => {
                  const hit = code
                    ? nhanVienAll.find((n) => n.maNV.toUpperCase() === code.trim().toUpperCase())
                    : nhanVienAll.find((n) => n.hoTen.toLowerCase() === ten.trim().toLowerCase());
                  applyNhanVien(code ?? hit?.maNV ?? maNV, ten, hit?.maBoPhan ?? undefined);
                }}
              />
              <select
                value={maBoPhan}
                onChange={(e) => setMaBoPhan(e.target.value)}
                className="mt-2 w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-ring/25"
              >
                <option value="">{t("pages.cuocDo.pickDept")}</option>
                {boPhan.map((bp) => (
                  <option key={bp.id} value={bp.maBoPhan ?? ""}>
                    {formatBoPhanLabel(bp)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">{t("pages.cuocDo.recipientHint")}</p>
              {!hasValidMaNV && hoTen.trim() && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  {t("pages.cuocDo.noMaNVWarning")}
                </p>
              )}
              {hasValidMaNV && <CuocDoQuotaProgress maNV={matchedNv.maNV} />}
            </Group>
          )}

          <Group label={t("pages.cuocDo.items")}>
            <DongPhucCatalogGrid vatTu={vatTu} hangMuc={hangMucList} onPick={addItemMaHang} />

            {lines.length > 0 && (
              <div className="mt-3 rounded-xl border border-border/70 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">{t("pages.cuocDo.colItem")}</th>
                      <th className="px-2 py-2 text-right font-semibold w-20">{t("pages.cuocDo.colQty")}</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const item = vatTu.find((v) => v.maHang === line.maHang);
                      return (
                        <tr key={line.key} className="border-t border-border/60">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <VatTuThumbnail
                                maHang={line.maHang}
                                tenSanPham={item?.tenSanPham}
                                hinhAnh={item?.hinhAnh}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{item?.tenSanPham ?? line.maHang}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {line.maHang} · {t("pages.cuocDo.stock")}: {fmt(item?.soLuongTon ?? 0)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            {isPb ? (
                              <span className="block text-right font-semibold pr-1">{fmt(line.soLuong)}</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={line.soLuong}
                                onChange={(e) => updateQty(line.key, Number(e.target.value))}
                                className="w-full h-8 px-2 rounded-md border border-border text-right font-semibold outline-none"
                              />
                            )}
                          </td>
                          <td className="px-1 py-2">
                            <button type="button" onClick={() => removeLine(line.key)} className="size-7 rounded-md hover:bg-muted text-muted-foreground">×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Group>

          <Group label={t("pages.cuocDo.note")}>
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] outline-none resize-none focus:ring-2 focus:ring-ring/25"
            />
          </Group>
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex items-center gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("pages.cuocDo.submit")}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}
