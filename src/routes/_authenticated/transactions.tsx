import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { getBoPhanList, getNhanVienList } from "@/lib/api/master.functions";
import { getVatTuList } from "@/lib/api/inventory.functions";
import {
  createPhieuNhap,
  createPhieuThuHoiBhld,
  createPhieuXuat,
  getThuHoiHangDaCap,
  getVoucherDetail,
  getVoucherList,
} from "@/lib/api/voucher.functions";
import { getCuocDoVatTuList } from "@/lib/api/cuocdo.functions";
import { DONG_PHUC_CATALOG_KEY } from "@/lib/dong-phuc-catalog";
import { DongPhucCatalogGrid } from "@/components/dong-phuc-catalog-grid";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { BHLD_RETURN_TAG, formatBhldTrangThai, formatDateVi } from "@/lib/bhld";
import { formatBoPhanLabel } from "@/lib/bo-phan";
import type { HangDaCapThuHoiRow, NhanVienRow, VatTuRow } from "@/lib/types/vpp";
import { VOUCHER_LABEL, type VoucherSummary, type VoucherType } from "@/lib/types/vpp";
import {
  Plus,
  FileDown,
  Printer,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  RotateCcw,
  HardHat,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Nhập – Xuất & Cấp phát – Stockflow" },
      { name: "description", content: "Sổ giao dịch nhập, xuất, cấp phát và thu hồi vật tư." },
    ],
  }),
  component: TransactionsPage,
});

const TYPE_TONE: Record<VoucherType, string> = {
  NHAP: "bg-info/12 text-info border-info/20",
  XUAT_CN: "bg-success/15 text-success-foreground/90 border-success/25",
  XUAT_PB: "bg-[oklch(0.6_0.18_295)]/15 text-[oklch(0.45_0.2_295)] border-[oklch(0.6_0.18_295)]/25",
  THU_HOI: "bg-warning/15 text-warning-foreground/90 border-warning/25",
  THU_HOI_BHLD: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  XUAT_CUOC_NV: "bg-primary/12 text-primary border-primary/25",
  XUAT_CUOC_CN: "bg-[#ff6900]/12 text-[#c44f00] border-[#ff6900]/25",
  XUAT_CUOC_PB: "bg-violet-500/12 text-violet-700 border-violet-500/25",
};

function VoucherTypeIcon({ type, className = "size-3" }: { type: VoucherType; className?: string }) {
  if (type === "NHAP") return <ArrowDownRight className={className} />;
  if (type === "THU_HOI" || type === "THU_HOI_BHLD") {
    return type === "THU_HOI_BHLD" ? <HardHat className={className} /> : <RotateCcw className={className} />;
  }
  return <ArrowUpRight className={className} />;
}

const VOUCHER_KEYS = {
  list: ["vouchers"] as const,
  inventory: ["vat-tu"] as const,
  dongPhuc: DONG_PHUC_CATALOG_KEY,
  boPhan: ["bo-phan"] as const,
  nhanVien: ["nhan-vien"] as const,
};

function invalidateStockQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: VOUCHER_KEYS.inventory });
  void queryClient.invalidateQueries({ queryKey: VOUCHER_KEYS.dongPhuc });
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** HTTP LAN không phải secure context — crypto.randomUUID có thể không có. */
function newRowKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function TransactionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: vouchers = [], isLoading, isError, error } = useQuery({
    queryKey: VOUCHER_KEYS.list,
    queryFn: () => getVoucherList(),
  });

  const [selectedSoPhieu, setSelectedSoPhieu] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | VoucherType>("ALL");
  const [q, setQ] = useState("");
  const [newPanel, setNewPanel] = useState<"NHAP" | "XUAT" | "THU_HOI_BHLD" | null>(null);

  useEffect(() => {
    if (vouchers.length && !selectedSoPhieu) {
      setSelectedSoPhieu(vouchers[0].soPhieu);
    }
  }, [vouchers, selectedSoPhieu]);

  const list = useMemo(() => {
    return vouchers.filter((v) => {
      if (filter !== "ALL" && v.loaiPhieu !== filter) return false;
      if (q && !`${v.soPhieu} ${v.recipient} ${v.department}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [vouchers, filter, q]);

  const selected = vouchers.find((v) => v.soPhieu === selectedSoPhieu) ?? list[0];

  return (
    <>
      <Topbar title={t("pages.transactions.title")} subtitle={t("pages.transactions.subtitle")} />
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0 min-h-0">
        <div className="flex flex-col border-r border-border/70 min-h-0 min-w-0 overflow-hidden bg-background/40">
          <div className="p-4 space-y-3 border-b border-border/70 min-w-0">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border/70 min-w-0">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm phiếu, người nhận, phòng ban…"
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewPanel("NHAP")}
                className="h-9 px-2 rounded-lg border border-info/40 bg-info/10 text-info text-[11.5px] font-semibold flex items-center justify-center gap-1 hover:bg-info/15 transition-colors min-w-0"
              >
                <ArrowDownRight className="size-3.5 shrink-0" />
                <span className="truncate">Nhập kho</span>
              </button>
              <button
                type="button"
                onClick={() => setNewPanel("XUAT")}
                className="h-9 px-2 rounded-lg bg-primary text-primary-foreground text-[11.5px] font-semibold flex items-center justify-center gap-1 hover:bg-primary-hover transition-colors shadow-[var(--shadow-glow)] min-w-0"
              >
                <Plus className="size-3.5 shrink-0" />
                <span className="truncate">Xuất kho</span>
              </button>
              <button
                type="button"
                onClick={() => setNewPanel("THU_HOI_BHLD")}
                className="h-9 px-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 text-[11.5px] font-semibold flex items-center justify-center gap-1 hover:bg-amber-500/15 transition-colors min-w-0"
              >
                <HardHat className="size-3.5 shrink-0" />
                <span className="truncate">Thu hồi BHLĐ</span>
              </button>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/60 w-fit flex-wrap">
              {([
                { id: "ALL", label: "Tất cả" },
                { id: "NHAP", label: "Nhập" },
                { id: "XUAT_CN", label: "Cá nhân" },
                { id: "XUAT_PB", label: "Phòng ban" },
                { id: "THU_HOI_BHLD", label: "BHLĐ" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={[
                    "px-2.5 h-7 rounded-md text-[12px] font-medium transition-all duration-200",
                    filter === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2.5">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-[13px]">
                <Loader2 className="size-4 animate-spin" /> Đang tải phiếu…
              </div>
            )}
            {isError && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-[12.5px] text-destructive flex gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error instanceof Error ? error.message : "Không tải được danh sách phiếu"}</span>
              </div>
            )}
            {!isLoading && !isError && list.length === 0 && (
              <p className="text-center text-[13px] text-muted-foreground py-12">Chưa có phiếu giao dịch.</p>
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

        <div className="overflow-auto p-6">
          {selected ? <VoucherDetail v={selected} /> : (
            <div className="grid place-items-center h-full text-muted-foreground text-[13px]">Chọn một phiếu để xem chi tiết</div>
          )}
        </div>
      </div>

      {newPanel === "XUAT" && (
        <NewPhieuXuatPanel
          onClose={() => setNewPanel(null)}
          onSuccess={(soPhieu) => {
            setNewPanel(null);
            setSelectedSoPhieu(soPhieu);
            void queryClient.invalidateQueries({ queryKey: VOUCHER_KEYS.list });
            invalidateStockQueries(queryClient);
          }}
        />
      )}
      {newPanel === "NHAP" && (
        <NewPhieuNhapPanel
          onClose={() => setNewPanel(null)}
          onSuccess={(soPhieu) => {
            setNewPanel(null);
            setSelectedSoPhieu(soPhieu);
            void queryClient.invalidateQueries({ queryKey: VOUCHER_KEYS.list });
            invalidateStockQueries(queryClient);
          }}
        />
      )}
      {newPanel === "THU_HOI_BHLD" && (
        <NewPhieuThuHoiBhldPanel
          onClose={() => setNewPanel(null)}
          onSuccess={(soPhieu) => {
            setNewPanel(null);
            setSelectedSoPhieu(soPhieu);
            void queryClient.invalidateQueries({ queryKey: VOUCHER_KEYS.list });
            invalidateStockQueries(queryClient);
          }}
        />
      )}
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
  return (
    <button
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      className={[
        "fluid-in w-full text-left p-3.5 rounded-xl border transition-all duration-200",
        active ? "bg-card border-primary/30 shadow-[var(--shadow-mica)]" : "bg-card/60 border-border/60 hover:border-border hover:bg-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10.5px] font-medium ${TYPE_TONE[v.loaiPhieu]}`}>
          <VoucherTypeIcon type={v.loaiPhieu} />
          {VOUCHER_LABEL[v.loaiPhieu]}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{v.soPhieu}</span>
      </div>
      <div className="text-[13.5px] font-semibold tracking-tight leading-tight">{v.recipient}</div>
      <div className="mt-1 text-[11.5px] text-muted-foreground flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {v.department}</span>
        <span className="inline-flex items-center gap-1"><Calendar className="size-3" /> {v.ngayLap}</span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {v.lineCount} dòng · {fmt(v.totalQty)} đơn vị
      </div>
    </button>
  );
}

function VoucherDetail({ v }: { v: VoucherSummary }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ["voucher-detail", v.soPhieu],
    queryFn: () => getVoucherDetail({ data: { soPhieu: v.soPhieu } }),
  });

  const lines = detail?.lines ?? [];
  const isBhld = v.loaiPhieu === "THU_HOI_BHLD";
  const showBhldDates = isBhld && lines.some((l) => l.ngayCap || l.soThangSuDung);
  const showBhldStatus = isBhld || lines.some((l) => l.trangThaiHang);
  const hidePriceCol = isBhld || showBhldDates;
  const detailExtraCols = (showBhldDates ? 3 : 0) + (showBhldStatus ? 1 : 0);

  return (
    <div className="max-w-3xl mx-auto fluid-in">
      <div className="card-elevated p-7">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${TYPE_TONE[v.loaiPhieu]}`}>
                <VoucherTypeIcon type={v.loaiPhieu} />
                {VOUCHER_LABEL[v.loaiPhieu]}
              </span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight">
              Phiếu <span className="font-mono text-primary">{v.soPhieu}</span>
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Lập lúc {v.ngayLap} bởi {v.nguoiLap ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-lg border border-border bg-card text-[12.5px] font-medium hover:bg-muted flex items-center gap-1.5">
              <Printer className="size-3.5" /> In phiếu
            </button>
            <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary-hover transition-colors shadow-[var(--shadow-glow)]">
              <FileDown className="size-3.5" /> Đối chiếu nhanh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-border/70">
          <Field
            icon={<User className="size-3.5" />}
            label={v.loaiPhieu === "NHAP" ? "Nhà cung cấp" : v.loaiPhieu === "THU_HOI_BHLD" ? "Người / bộ phận trả" : v.loaiPhieu === "THU_HOI" ? "Nguồn thu hồi" : "Người nhận"}
            value={v.recipient}
            sub={v.maNV ?? undefined}
          />
          <Field icon={<Building2 className="size-3.5" />} label="Phòng ban" value={v.department} />
          <Field icon={<Calendar className="size-3.5" />} label="Thời gian lập" value={v.ngayLap} />
        </div>

        <div className="pt-5">
          <h2 className="text-[13.5px] font-semibold mb-3">Danh sách vật phẩm</h2>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-6">
              <Loader2 className="size-4 animate-spin" /> Đang tải chi tiết…
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-x-auto">
              <table className="w-full text-[13px] min-w-[640px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Mã hàng</th>
                    <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Tên vật phẩm</th>
                    {showBhldDates && (
                      <>
                        <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Bắt đầu SD</th>
                        <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Ngày thu hồi</th>
                        <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-right">Tháng SD</th>
                      </>
                    )}
                    {showBhldStatus && (
                      <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Trạng thái</th>
                    )}
                    <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold">Đơn vị</th>
                    <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-right">Số lượng</th>
                    {!hidePriceCol && (
                      <th className="px-3.5 py-2 text-[10.5px] uppercase tracking-wider font-semibold text-right">Đơn giá</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={`${l.maHang}-${l.ngayCap ?? ""}`} className="border-t border-border/60">
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-primary font-semibold">{l.maHang}</td>
                      <td className="px-3.5 py-2.5 font-medium">{l.tenSanPham}</td>
                      {showBhldDates && (
                        <>
                          <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{formatDateVi(l.ngayCap)}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">{formatDateVi(l.ngayThuHoi)}</td>
                          <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">{l.soThangSuDung ?? "—"}</td>
                        </>
                      )}
                      {showBhldStatus && (
                        <td className="px-3.5 py-2.5">
                          {l.trangThaiHang && (
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-500/25 text-[10.5px] font-semibold">
                              {formatBhldTrangThai(l.trangThaiHang) ?? BHLD_RETURN_TAG}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-3.5 py-2.5 text-muted-foreground">{l.donViTinh}</td>
                      <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">{fmt(l.soLuong)}</td>
                      {!hidePriceCol && (
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(l.donGia)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t border-border/70">
                  <tr>
                    <td colSpan={2 + detailExtraCols} className="px-3.5 py-2.5 text-[12px] text-muted-foreground font-medium">Tổng số đơn vị</td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-primary tabular-nums">
                      {fmt(lines.reduce((s, l) => s + l.soLuong, 0))}
                    </td>
                    {!hidePriceCol && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {v.ghiChu && (
            <div className="mt-4 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-[12.5px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">Ghi chú: </span>
              {v.ghiChu}
            </div>
          )}

          {v.loaiPhieu === "NHAP" || v.loaiPhieu === "THU_HOI" || v.loaiPhieu === "THU_HOI_BHLD" ? (
            <div
              className={[
                "mt-5 flex items-center gap-3 p-3.5 rounded-lg border",
                v.loaiPhieu === "NHAP"
                  ? "bg-info/10 border-info/25"
                  : v.loaiPhieu === "THU_HOI_BHLD"
                    ? "bg-amber-500/10 border-amber-500/25"
                    : "bg-warning/10 border-warning/25",
              ].join(" ")}
            >
              <div
                className={[
                  "size-8 rounded-full grid place-items-center font-bold",
                  v.loaiPhieu === "NHAP"
                    ? "bg-info/25 text-info"
                    : v.loaiPhieu === "THU_HOI_BHLD"
                      ? "bg-amber-500/25 text-amber-800"
                      : "bg-warning/25 text-warning-foreground/90",
                ].join(" ")}
              >
                {v.loaiPhieu === "NHAP" ? "↓" : v.loaiPhieu === "THU_HOI_BHLD" ? "⛑" : "↺"}
              </div>
              <div>
                <div
                  className={[
                    "text-[12.5px] font-semibold",
                    v.loaiPhieu === "NHAP"
                      ? "text-info"
                      : v.loaiPhieu === "THU_HOI_BHLD"
                        ? "text-amber-800"
                        : "text-warning-foreground/90",
                  ].join(" ")}
                >
                  {v.loaiPhieu === "NHAP"
                    ? "Đã ghi nhận nhập kho"
                    : v.loaiPhieu === "THU_HOI_BHLD"
                      ? "Đã ghi nhận thu hồi đồ trả (nhập nội bộ)"
                      : "Đã ghi nhận thu hồi hoàn kho"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tồn kho đã được cộng dồn · {v.recipient} · {v.ngayLap}
                  {v.loaiPhieu === "THU_HOI_BHLD" && ` · Tag: ${BHLD_RETURN_TAG}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 p-3.5 rounded-lg bg-success/10 border border-success/25">
              <div className="size-8 rounded-full bg-success/25 grid place-items-center text-success-foreground/90 font-bold">✓</div>
              <div>
                <div className="text-[12.5px] font-semibold text-success-foreground/90">Đã ghi nhận xuất kho</div>
                <div className="text-[11px] text-muted-foreground">
                  {v.recipient} {v.maNV && `(${v.maNV})`} · {v.ngayLap}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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

type DraftLine = { maHang: string; soLuong: number };

type NhapDraftLine = { key: string; maHang: string; soLuong: number; donGia: number };

function NewPhieuNhapPanel({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (soPhieu: string) => void;
}) {
  const [nguoiLap, setNguoiLap] = useState("Thủ kho");
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<NhapDraftLine[]>([]);

  const { data: vatTu = [] } = useQuery({ queryKey: VOUCHER_KEYS.inventory, queryFn: () => getVatTuList() });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = lines.filter((l) => l.maHang && l.soLuong > 0);
      return createPhieuNhap({
        data: {
          nguoiLap,
          ghiChu: ghiChu || undefined,
          lines: payload.map((l) => ({ maHang: l.maHang, soLuong: l.soLuong, donGia: l.donGia })),
        },
      });
    },
    onSuccess: (result) => {
      toast.success(`Nhập kho thành công — phiếu ${result.soPhieu}`);
      onSuccess(result.soPhieu);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không tạo được phiếu nhập");
    },
  });

  function addRow() {
    const used = new Set(lines.map((l) => l.maHang));
    const next = vatTu.find((v) => !used.has(v.maHang));
    setLines((prev) => [
      ...prev,
      {
        key: newRowKey(),
        maHang: next?.maHang ?? "",
        soLuong: 1,
        donGia: next?.donGia ?? 0,
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<NhapDraftLine>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const merged = { ...l, ...patch };
        if (patch.maHang) {
          const item = vatTu.find((v) => v.maHang === patch.maHang);
          if (item && patch.donGia === undefined) merged.donGia = item.donGia;
        }
        return merged;
      }),
    );
  }

  function removeRow(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const validLines = lines.filter((l) => l.maHang && l.soLuong > 0);
  const canSubmit = validLines.length > 0 && nguoiLap.trim() && !mutation.isPending;
  const totalQty = validLines.reduce((s, l) => s + l.soLuong, 0);
  const totalAmount = validLines.reduce((s, l) => s + l.soLuong * l.donGia, 0);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[560px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Lập phiếu nhập kho</h2>
            <p className="text-[11.5px] text-muted-foreground">Ghi nhận nhập kho và cập nhật tồn trong một lần lưu</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <Group label="Người lập phiếu">
            <input
              value={nguoiLap}
              onChange={(e) => setNguoiLap(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25"
            />
          </Group>

          <Group label="Ghi chú / Nhà cung cấp">
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              placeholder="VD: Công ty TNHH Bảo Hộ Á Châu — HĐ #BHAC-2026/0521"
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25 resize-none"
            />
          </Group>

          <Group label="Danh sách hàng nhập">
            <div className="rounded-xl border border-border/70 overflow-hidden">
              <table className="w-full text-[12.5px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] uppercase font-semibold">Mã hàng</th>
                    <th className="px-2 py-2 text-right text-[10px] uppercase font-semibold w-20">Số lượng</th>
                    <th className="px-2 py-2 text-right text-[10px] uppercase font-semibold w-24">Đơn giá</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <NhapRowEditor
                      key={line.key}
                      line={line}
                      vatTu={vatTu}
                      usedMaHang={new Set(lines.filter((l) => l.key !== line.key).map((l) => l.maHang))}
                      onChange={(patch) => updateRow(line.key, patch)}
                      onRemove={() => removeRow(line.key)}
                    />
                  ))}
                </tbody>
              </table>
              {lines.length === 0 && (
                <p className="text-[12px] text-muted-foreground text-center py-6">Chưa có dòng hàng.</p>
              )}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 w-full h-9 rounded-lg border border-dashed border-border text-[12.5px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              + Thêm dòng
            </button>
          </Group>

          {validLines.length > 0 && (
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60 text-[12px] flex justify-between">
              <span className="text-muted-foreground">{validLines.length} mặt hàng · {fmt(totalQty)} đơn vị</span>
              <span className="font-semibold">≈ {fmt(Math.round(totalAmount))} ₫</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex items-center gap-2 bg-muted/30">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            Hủy
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex-[2] h-10 rounded-lg bg-info text-white text-[13px] font-semibold hover:bg-info/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Hoàn tất nhập kho
          </button>
        </div>
      </aside>
    </div>
  );
}

function NhapRowEditor({
  line,
  vatTu,
  usedMaHang,
  onChange,
  onRemove,
}: {
  line: NhapDraftLine;
  vatTu: VatTuRow[];
  usedMaHang: Set<string>;
  onChange: (patch: Partial<NhapDraftLine>) => void;
  onRemove: () => void;
}) {
  const item = vatTu.find((v) => v.maHang === line.maHang);

  return (
    <tr className="border-t border-border/60">
      <td className="px-2 py-2">
        <select
          value={line.maHang}
          onChange={(e) => onChange({ maHang: e.target.value })}
          className="w-full h-8 px-2 rounded-md border border-border bg-card text-[12px] outline-none"
        >
          <option value="">— Chọn mã —</option>
          {vatTu
            .filter((v) => v.maHang === line.maHang || !usedMaHang.has(v.maHang))
            .map((v) => (
              <option key={v.maHang} value={v.maHang}>
                {v.maHang} — {v.tenSanPham.slice(0, 28)}
              </option>
            ))}
        </select>
        {item && <div className="text-[10px] text-muted-foreground mt-0.5">{item.donViTinh} · Tồn: {fmt(item.soLuongTon)}</div>}
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0.01}
          step="any"
          value={line.soLuong}
          onChange={(e) => onChange({ soLuong: Number(e.target.value) })}
          className="w-full h-8 px-2 rounded-md border border-border bg-card text-right text-[12px] font-semibold outline-none"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step="any"
          value={line.donGia}
          onChange={(e) => onChange({ donGia: Number(e.target.value) })}
          className="w-full h-8 px-2 rounded-md border border-border bg-card text-right text-[12px] outline-none"
          title="Đơn giá theo hóa đơn thực tế"
        />
      </td>
      <td className="px-1 py-2">
        <button type="button" onClick={onRemove} className="size-7 rounded-md hover:bg-muted text-muted-foreground text-sm">×</button>
      </td>
    </tr>
  );
}

function NewPhieuXuatPanel({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (soPhieu: string) => void;
}) {
  const [loaiPhieu, setLoaiPhieu] = useState<"XUAT_CN" | "XUAT_PB">("XUAT_CN");
  const [maNV, setMaNV] = useState("");
  const [hoTenNV, setHoTenNV] = useState("");
  const [maBoPhan, setMaBoPhan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [skuInput, setSkuInput] = useState("");

  const { data: vatTu = [] } = useQuery({ queryKey: VOUCHER_KEYS.inventory, queryFn: () => getVatTuList() });
  const { data: nhanVien = [] } = useQuery({ queryKey: VOUCHER_KEYS.nhanVien, queryFn: () => getNhanVienList() });
  const { data: boPhan = [] } = useQuery({ queryKey: VOUCHER_KEYS.boPhan, queryFn: () => getBoPhanList() });

  const mutation = useMutation({
    mutationFn: () =>
      createPhieuXuat({
        data: {
          loaiPhieu,
          nguoiLap: "Thủ kho",
          maNV: loaiPhieu === "XUAT_CN" ? maNV.trim() : undefined,
          maBoPhan: loaiPhieu === "XUAT_PB" ? maBoPhan : undefined,
          ghiChu: ghiChu || undefined,
          lines,
        },
      }),
    onSuccess: (result) => {
      toast.success(`Tạo phiếu ${result.soPhieu} thành công`);
      onSuccess(result.soPhieu);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không tạo được phiếu xuất");
    },
  });

  function addLine(maHang: string) {
    const code = maHang.trim().toUpperCase();
    if (!code) return;
    const item = vatTu.find((v) => v.maHang.toUpperCase() === code);
    if (!item) {
      toast.error(`Mã hàng ${code} không có trong danh mục`);
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.maHang === item.maHang);
      if (existing) {
        return prev.map((l) => (l.maHang === item.maHang ? { ...l, soLuong: l.soLuong + 1 } : l));
      }
      return [...prev, { maHang: item.maHang, soLuong: 1 }];
    });
    setSkuInput("");
  }

  function updateQty(maHang: string, soLuong: number) {
    setLines((prev) => prev.map((l) => (l.maHang === maHang ? { ...l, soLuong: Math.max(0, soLuong) } : l)).filter((l) => l.soLuong > 0));
  }

  const canSubmit =
    lines.length > 0 &&
    ((loaiPhieu === "XUAT_CN" && maNV.trim() && hoTenNV.trim()) ||
      (loaiPhieu === "XUAT_PB" && maBoPhan)) &&
    !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[480px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Lập phiếu xuất kho</h2>
            <p className="text-[11.5px] text-muted-foreground">Kiểm tra tồn kho và định mức trước khi xuất</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <Group label="Loại phiếu xuất">
            <div className="grid grid-cols-2 gap-2">
              {(["XUAT_CN", "XUAT_PB"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLoaiPhieu(t)}
                  className={[
                    "px-3 py-2.5 rounded-lg border text-[12px] font-medium text-left transition-all",
                    loaiPhieu === t ? "border-primary bg-primary/8 text-primary" : "border-border bg-card hover:bg-muted",
                  ].join(" ")}
                >
                  {VOUCHER_LABEL[t]}
                </button>
              ))}
            </div>
          </Group>

          {loaiPhieu === "XUAT_CN" ? (
            <Group label="Nhân viên nhận">
              <NhanVienManualFields
                listIdPrefix="xuat-nv"
                nhanVien={nhanVien}
                maNV={maNV}
                hoTen={hoTenNV}
                onMaNVChange={(code, ten) => {
                  setMaNV(code);
                  if (ten !== undefined) setHoTenNV(ten);
                }}
                onHoTenChange={(ten, code) => {
                  setHoTenNV(ten);
                  if (code !== undefined) setMaNV(code);
                }}
              />
            </Group>
          ) : (
            <Group label="Bộ phận nhận">
              <select
                value={maBoPhan}
                onChange={(e) => setMaBoPhan(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">— Chọn bộ phận —</option>
                {boPhan.filter((bp) => bp.maBoPhan).map((bp) => (
                  <option key={bp.id} value={bp.maBoPhan!}>
                    {bp.maBoPhan} — {bp.tenBoPhan}
                  </option>
                ))}
              </select>
            </Group>
          )}

          <Group label="Ghi chú">
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25 resize-none"
              placeholder="Ghi chú phiếu (tùy chọn)"
            />
          </Group>

          <Group label="Vật phẩm xuất kho">
            <div className="flex gap-2">
              <input
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLine(skuInput))}
                placeholder="Nhập mã hàng"
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="button"
                onClick={() => addLine(skuInput)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium hover:bg-muted"
              >
                Thêm
              </button>
            </div>
            <div className="mt-2 space-y-2 max-h-48 overflow-auto">
              {lines.map((line) => {
                const item = vatTu.find((v) => v.maHang === line.maHang);
                const avail = item?.soLuongTon ?? 0;
                const over = line.soLuong > avail;
                return (
                  <div key={line.maHang} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium truncate">{item?.tenSanPham ?? line.maHang}</div>
                      <div className="text-[10.5px] text-muted-foreground font-mono">
                        {line.maHang} · Tồn: {fmt(avail)}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={line.soLuong}
                      onChange={(e) => updateQty(line.maHang, Number(e.target.value))}
                      className={[
                        "w-16 text-right h-8 px-2 rounded-md border outline-none text-[12.5px] font-semibold",
                        over ? "border-destructive bg-destructive/8 text-destructive" : "border-border bg-card",
                      ].join(" ")}
                    />
                  </div>
                );
              })}
              {lines.length === 0 && (
                <p className="text-[12px] text-muted-foreground py-2">Chưa có dòng hàng. Thêm mã từ danh mục vật tư.</p>
              )}
            </div>
          </Group>

          {lines.some((l) => {
            const item = vatTu.find((v) => v.maHang === l.maHang);
            return l.soLuong > (item?.soLuongTon ?? 0);
          }) && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-[12px]">
              <div className="font-semibold text-destructive mb-0.5">Không đủ tồn kho</div>
              <div className="text-muted-foreground">Một hoặc nhiều mặt hàng vượt tồn kho hiện có. Hệ thống sẽ từ chối khi lưu.</div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex items-center gap-2 bg-muted/30">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            Hủy
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover transition-colors shadow-[var(--shadow-glow)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Hoàn tất xuất kho
          </button>
        </div>
      </aside>
    </div>
  );
}

type ThuTraSelection = Record<string, { selected: boolean; soLuong: number }>;

const EMPTY_HANG_DA_CAP: HangDaCapThuHoiRow[] = [];

function NewPhieuThuHoiBhldPanel({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (soPhieu: string) => void;
}) {
  const [nguoiLap, setNguoiLap] = useState("Thủ kho");
  const [maNV, setMaNV] = useState("");
  const [hoTenNV, setHoTenNV] = useState("");
  const [maBoPhan, setMaBoPhan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [selection, setSelection] = useState<ThuTraSelection>({});

  const { data: vatTu = [] } = useQuery({ queryKey: VOUCHER_KEYS.dongPhuc, queryFn: () => getCuocDoVatTuList() });
  const { data: nhanVien = [] } = useQuery({ queryKey: VOUCHER_KEYS.nhanVien, queryFn: () => getNhanVienList() });
  const { data: boPhan = [] } = useQuery({ queryKey: VOUCHER_KEYS.boPhan, queryFn: () => getBoPhanList() });

  const matchedNvFromList = nhanVien.find((n) => n.maNV.toUpperCase() === maNV.trim().toUpperCase());

  const lookupMaNV = matchedNvFromList?.maNV ?? maNV.trim();
  const lookupHoTen = matchedNvFromList?.hoTen ?? hoTenNV.trim();
  const shouldLoadDaCap =
    lookupMaNV.length >= 2 ||
    (lookupHoTen.length >= 2 &&
      nhanVien.some((n) => n.hoTen.toLowerCase() === lookupHoTen.toLowerCase()));

  const { data: daCapResult, isFetching: loadingDaCap, isSuccess: loadedDaCap } = useQuery({
    queryKey: ["thu-hoi-da-cap", lookupMaNV, lookupHoTen],
    queryFn: () =>
      getThuHoiHangDaCap({
        data: { maNV: lookupMaNV || undefined, hoTen: lookupHoTen || undefined },
      }),
    enabled: shouldLoadDaCap,
  });

  const hangDaCapData = daCapResult?.items;
  const nhanVienLookup = daCapResult?.nhanVien;

  const matchedNv = useMemo((): NhanVienRow | undefined => {
    if (matchedNvFromList) return matchedNvFromList;
    if (!nhanVienLookup) return undefined;
    return {
      id: 0,
      maNV: nhanVienLookup.maNV,
      hoTen: nhanVienLookup.hoTen,
      chucDanh: nhanVienLookup.chucDanh,
      boPhanId: null,
      maBoPhan: nhanVienLookup.maBoPhan,
      tenBoPhan: nhanVienLookup.tenBoPhan,
      sizeAo: null,
      sizeGiay: null,
      trangThai: "Đang làm việc",
    };
  }, [matchedNvFromList, nhanVienLookup]);

  const hangDaCap = hangDaCapData ?? EMPTY_HANG_DA_CAP;

  const maxQtyByMaHang = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of hangDaCap) map[row.maHang] = row.soLuongConLai;
    return map;
  }, [hangDaCapData]);

  const autoSelectSignature = useMemo(
    () => hangDaCap.map((r) => `${r.maHang}:${r.soLuongConLai}`).join("|"),
    [hangDaCapData],
  );

  useEffect(() => {
    if (!shouldLoadDaCap) {
      setSelection((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (!loadedDaCap) return;

    const rows = hangDaCapData ?? EMPTY_HANG_DA_CAP;
    if (rows.length === 0) {
      setSelection((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const next: ThuTraSelection = {};
    for (const row of rows) {
      next[row.maHang] = { selected: true, soLuong: row.soLuongConLai };
    }
    setSelection((prev) => {
      const prevSig = Object.entries(prev)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v.soLuong}`)
        .join("|");
      if (prevSig === autoSelectSignature) return prev;
      return next;
    });
  }, [shouldLoadDaCap, loadedDaCap, autoSelectSignature, hangDaCapData]);

  useEffect(() => {
    if (!nhanVienLookup) return;
    setHoTenNV((prev) => (prev.trim() ? prev : nhanVienLookup.hoTen));
    if (nhanVienLookup.maBoPhan) {
      setMaBoPhan((prev) => prev || nhanVienLookup.maBoPhan || "");
    }
    if (!maNV.trim() && nhanVienLookup.maNV) {
      setMaNV(nhanVienLookup.maNV);
    }
  }, [nhanVienLookup, maNV]);

  function applyNhanVien(code: string, ten?: string, deptMa?: string | null) {
    setMaNV(code);
    if (ten !== undefined) setHoTenNV(ten);
    if (deptMa) setMaBoPhan(deptMa);
    else if (!code.trim()) setMaBoPhan("");
  }

  function toggleItem(maHang: string) {
    setSelection((prev) => {
      if (prev[maHang]?.selected) {
        const next = { ...prev };
        delete next[maHang];
        return next;
      }
      return { ...prev, [maHang]: { selected: true, soLuong: 1 } };
    });
  }

  function setItemQty(maHang: string, soLuong: number) {
    const max = maxQtyByMaHang[maHang];
    const qty = Math.max(1, soLuong);
    setSelection((prev) => ({
      ...prev,
      [maHang]: {
        selected: true,
        soLuong: max != null ? Math.min(qty, max) : qty,
      },
    }));
  }

  const selectedLines = vatTu.filter((v) => selection[v.maHang]?.selected);

  const mutation = useMutation({
    mutationFn: () =>
      createPhieuThuHoiBhld({
        data: {
          nguoiLap,
          maNV: maNV.trim(),
          hoTenNguoiTra: hoTenNV.trim(),
          maBoPhan: maBoPhan || undefined,
          ghiChu: ghiChu || undefined,
          lines: selectedLines.map((v) => ({
            maHang: v.maHang,
            soLuong: selection[v.maHang].soLuong,
            donGia: v.donGia,
          })),
        },
      }),
    onSuccess: (result) => {
      toast.success(`Thu hồi thành công — phiếu ${result.soPhieu}`);
      onSuccess(result.soPhieu);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không tạo được phiếu thu hồi");
    },
  });

  const canSubmit =
    maNV.trim() &&
    hoTenNV.trim() &&
    selectedLines.length > 0 &&
    nguoiLap.trim() &&
    !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[520px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Thu hồi đồ trả</h2>
            <p className="text-[11.5px] text-muted-foreground">Cùng danh mục kho đồng phục · cộng tồn · tag &quot;{BHLD_RETURN_TAG}&quot;</p>
          </div>
          <button type="button" onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <Group label="Người lập phiếu">
            <input
              value={nguoiLap}
              onChange={(e) => setNguoiLap(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-amber-500/25"
            />
          </Group>

          <Group label="Nhân viên / công nhân trả đồ">
            <NhanVienManualFields
              listIdPrefix="bhld-nv"
              nhanVien={nhanVien}
              maNV={maNV}
              hoTen={hoTenNV}
              onMaNVChange={(code, ten) => {
                const hit = nhanVien.find((n) => n.maNV.toUpperCase() === code.trim().toUpperCase());
                applyNhanVien(code, ten ?? hit?.hoTen, hit?.maBoPhan ?? null);
              }}
              onHoTenChange={(ten, code) => {
                const hit = code
                  ? nhanVien.find((n) => n.maNV.toUpperCase() === code.trim().toUpperCase())
                  : nhanVien.find((n) => n.hoTen.toLowerCase() === ten.trim().toLowerCase());
                applyNhanVien(code ?? hit?.maNV ?? maNV, ten, hit?.maBoPhan ?? null);
              }}
            />
            <div className="mt-3">
              <span className="text-[10.5px] text-muted-foreground font-medium mb-1 block">Bộ phận</span>
              <select
                value={maBoPhan}
                onChange={(e) => setMaBoPhan(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-amber-500/25"
              >
                <option value="">— Tự điền từ hồ sơ —</option>
                {boPhan.filter((bp) => bp.maBoPhan).map((bp) => (
                  <option key={bp.id} value={bp.maBoPhan!}>
                    {formatBoPhanLabel(bp)}
                  </option>
                ))}
              </select>
              {matchedNv?.tenBoPhan && maBoPhan && (
                <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                  {matchedNv.maBoPhan === maBoPhan
                    ? `Đồng bộ từ hồ sơ: ${matchedNv.tenBoPhan}`
                    : "Đã chọn bộ phận khác hồ sơ nhân viên"}
                </p>
              )}
            </div>
          </Group>

          <Group label="Ghi chú">
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              placeholder="VD: Nghỉ việc, trả đồ trước khi ra về"
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-amber-500/25 resize-none"
            />
          </Group>

          <Group label="Đồ trả lại (từ kho đồng phục)">
            {shouldLoadDaCap && (
              <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[11.5px] text-amber-950/90">
                {loadingDaCap ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    Đang tra cứu hàng đã cấp…
                  </span>
                ) : hangDaCap.length > 0 ? (
                  <>
                    Đã chọn tự động <strong>{hangDaCap.length}</strong> mặt hàng đã cấp cho{" "}
                    <strong>{hoTenNV.trim() || nhanVienLookup?.hoTen || lookupMaNV}</strong> — kiểm tra số lượng rồi xác nhận thu hồi.
                  </>
                ) : (
                  <>Chưa tìm thấy phiếu cấp cược đồ cho nhân viên này — chọn tay từ danh mục bên dưới.</>
                )}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mb-3">
              Nhập mã hoặc tên nhân viên để tự chọn đồ đã cấp; vẫn có thể bỏ chọn hoặc chỉnh số lượng.
            </p>
            {vatTu.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                Đang tải danh mục kho…
              </p>
            ) : (
              <DongPhucCatalogGrid
                vatTu={vatTu}
                onPick={toggleItem}
                selectedMaHang={new Set(Object.keys(selection))}
              />
            )}

            {selectedLines.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedLines.map((item) => {
                  const qty = selection[item.maHang]?.soLuong ?? 1;
                  return (
                    <div
                      key={item.maHang}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5"
                    >
                      <VatTuThumbnail maHang={item.maHang} tenSanPham={item.tenSanPham} hinhAnh={item.hinhAnh} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium truncate">{item.tenSanPham}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.maHang} · Tồn: {fmt(item.soLuongTon)}
                        </div>
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-500/25 text-[10px] font-semibold shrink-0">
                        {BHLD_RETURN_TAG}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-muted-foreground">SL</span>
                        <input
                          type="number"
                          min={1}
                          max={maxQtyByMaHang[item.maHang]}
                          value={qty}
                          onChange={(e) => setItemQty(item.maHang, Number(e.target.value) || 1)}
                          className="w-14 h-8 px-2 rounded-md border border-border text-right font-semibold text-[12px] outline-none"
                        />
                        {maxQtyByMaHang[item.maHang] != null && (
                          <span className="text-[10px] text-muted-foreground">/ {fmt(maxQtyByMaHang[item.maHang])}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItem(item.maHang)}
                        className="size-7 rounded-md hover:bg-muted text-muted-foreground shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Group>
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex items-center gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            Hủy
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex-[2] h-10 rounded-lg bg-amber-600 text-white text-[13px] font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Hoàn tất thu hồi
          </button>
        </div>
      </aside>
    </div>
  );
}

const fieldInputCls =
  "w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25";

function NhanVienManualFields({
  listIdPrefix,
  nhanVien,
  maNV,
  hoTen,
  onMaNVChange,
  onHoTenChange,
}: {
  listIdPrefix: string;
  nhanVien: NhanVienRow[];
  maNV: string;
  hoTen: string;
  onMaNVChange: (maNV: string, hoTen?: string) => void;
  onHoTenChange: (hoTen: string, maNV?: string) => void;
}) {
  const matched = nhanVien.find((n) => n.maNV.toUpperCase() === maNV.trim().toUpperCase());

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10.5px] text-muted-foreground font-medium mb-1 block">Mã nhân viên</span>
          <input
            value={maNV}
            onChange={(e) => {
              const code = e.target.value;
              const hit = nhanVien.find((n) => n.maNV.toUpperCase() === code.trim().toUpperCase());
              onMaNVChange(code, hit?.hoTen);
            }}
            onBlur={() => {
              const hit = nhanVien.find((n) => n.maNV.toUpperCase() === maNV.trim().toUpperCase());
              if (hit) onMaNVChange(hit.maNV, hit.hoTen);
            }}
            list={`${listIdPrefix}-ma`}
            placeholder="VD: NV001"
            className={fieldInputCls}
            autoComplete="off"
          />
          <datalist id={`${listIdPrefix}-ma`}>
            {nhanVien.map((nv) => (
              <option key={nv.maNV} value={nv.maNV}>
                {nv.hoTen}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <span className="text-[10.5px] text-muted-foreground font-medium mb-1 block">Họ và tên</span>
          <input
            value={hoTen}
            onChange={(e) => {
              const ten = e.target.value;
              const hit = nhanVien.find((n) => n.hoTen.toLowerCase() === ten.trim().toLowerCase());
              onHoTenChange(ten, hit?.maNV);
            }}
            onBlur={() => {
              const hit = nhanVien.find((n) => n.hoTen.toLowerCase() === hoTen.trim().toLowerCase());
              if (hit) onHoTenChange(hit.hoTen, hit.maNV);
            }}
            list={`${listIdPrefix}-ten`}
            placeholder="Nhập họ tên"
            className={fieldInputCls}
            autoComplete="off"
          />
          <datalist id={`${listIdPrefix}-ten`}>
            {nhanVien.map((nv) => (
              <option key={nv.maNV} value={nv.hoTen}>
                {nv.maNV}
              </option>
            ))}
          </datalist>
        </div>
      </div>
      {matched && (
        <p className="text-[11px] text-muted-foreground">
          {matched.chucDanh ?? "—"} · {matched.tenBoPhan ?? "—"}
          {matched.sizeAo ? ` · Size áo: ${matched.sizeAo}` : ""}
        </p>
      )}
      {maNV.trim() && !matched && (
        <p className="text-[11px] text-warning-foreground/90">
          Mã chưa khớp danh sách nhân sự — vui lòng kiểm tra lại trước khi lưu.
        </p>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
