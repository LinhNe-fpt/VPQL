import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { VatTuFormPanel } from "@/components/vat-tu-form-panel";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { useClientSession } from "@/lib/auth";
import { deleteVatTuFn, getCatalogList } from "@/lib/api/product.functions";
import type { VatTuRow } from "@/lib/types/vpp";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
  Boxes,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Danh mục vật tư – Stockflow" },
      { name: "description", content: "Thêm, sửa, xóa toàn bộ vật tư trong kho." },
    ],
  }),
  component: ProductsPage,
});

const CATALOG_KEYS = {
  list: ["vat-tu-catalog"] as const,
  inventory: ["vat-tu"] as const,
};

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function ProductsPage() {
  const { t } = useTranslation();
  const session = useClientSession();
  const changedBy = session?.displayName ?? session?.username ?? null;
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: CATALOG_KEYS.list,
    queryFn: () => getCatalogList(),
  });

  const [q, setQ] = useState("");
  const [filterNhom, setFilterNhom] = useState("Tất cả nhóm");
  const [selectedMaHang, setSelectedMaHang] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);

  const nhomOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.nhomHang).filter(Boolean) as string[]);
    return ["Tất cả nhóm", ...Array.from(set).sort()];
  }, [items]);

  const rows = useMemo(() => {
    return items.filter((p) => {
      if (filterNhom !== "Tất cả nhóm" && p.nhomHang !== filterNhom) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return `${p.maHang} ${p.tenSanPham} ${p.nhomHang ?? ""} ${p.donViTinh}`.toLowerCase().includes(needle);
    });
  }, [items, q, filterNhom]);

  useEffect(() => {
    if (rows.length && selectedMaHang && !rows.some((r) => r.maHang === selectedMaHang)) {
      setSelectedMaHang(rows[0].maHang);
    } else if (rows.length && !selectedMaHang) {
      setSelectedMaHang(rows[0].maHang);
    }
  }, [rows, selectedMaHang]);

  const selected = items.find((p) => p.maHang === selectedMaHang) ?? rows[0] ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: CATALOG_KEYS.list });
    void queryClient.invalidateQueries({ queryKey: CATALOG_KEYS.inventory });
    void queryClient.invalidateQueries({ queryKey: ["dong-phuc-catalog"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (maHang: string) => deleteVatTuFn({ data: { maHang, changedBy } }),
    onSuccess: () => {
      toast.success("Đã xóa vật tư");
      setSelectedMaHang(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không xóa được"),
  });

  const lowStockCount = items.filter((p) => p.soLuongTon <= p.minStock).length;

  return (
    <>
      <Topbar title={t("pages.products.title")} subtitle={t("pages.products.subtitle")} />
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[400px_1fr] min-h-0">
        <div className="flex flex-col border-r border-border/70 bg-background/40 min-h-0">
          <div className="p-4 space-y-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border/70">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm mã, tên vật tư…"
                  className="flex-1 bg-transparent outline-none text-[13px]"
                />
              </div>
              <button
                onClick={() => setFormMode("create")}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary-hover shrink-0"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Thêm</span>
              </button>
            </div>
            <select
              value={filterNhom}
              onChange={(e) => setFilterNhom(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] outline-none focus:ring-2 focus:ring-primary/25"
            >
              {nhomOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <p className="text-[11.5px] text-muted-foreground">
              {fmt(items.length)} mã hàng · {fmt(lowStockCount)} sắp hết kho
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-[13px]">
                <Loader2 className="size-4 animate-spin" /> Đang tải danh mục…
              </div>
            )}
            {isError && (
              <div className="m-4 p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-destructive text-[12.5px] flex gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error instanceof Error ? error.message : "Không tải được danh mục"}</span>
              </div>
            )}
            {!isLoading && !isError && rows.map((p) => {
              const active = selected?.maHang === p.maHang;
              const low = p.soLuongTon <= p.minStock;
              return (
                <button
                  key={p.maHang}
                  type="button"
                  onClick={() => setSelectedMaHang(p.maHang)}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-border/50 transition-colors flex items-center gap-3",
                    active ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent",
                  ].join(" ")}
                >
                  <VatTuThumbnail maHang={p.maHang} tenSanPham={p.tenSanPham} hinhAnh={p.hinhAnh} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11.5px] text-primary font-semibold">{p.maHang}</div>
                    <div className="text-[13px] font-medium truncate">{p.tenSanPham}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {p.nhomHang ?? "—"} · Tồn {fmt(p.soLuongTon)} {p.donViTinh}
                      {low && <span className="text-warning-foreground/90 ml-1">· Sắp hết</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {!isLoading && !isError && rows.length === 0 && (
              <p className="text-center text-[13px] text-muted-foreground py-12 px-4">
                Không có vật tư phù hợp. Bấm Thêm để tạo mới.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0 overflow-auto">
          {!selected ? (
            <div className="flex-1 grid place-items-center p-8 text-muted-foreground text-[13px]">
              Chọn vật tư bên trái hoặc thêm mới
            </div>
          ) : (
            <VatTuDetail
              item={selected}
              onEdit={() => setFormMode("edit")}
              onDelete={() => {
                if (confirm(`Xóa vật tư ${selected.maHang}?\nChỉ xóa được khi tồn = 0 và chưa có phiếu.`)) {
                  deleteMutation.mutate(selected.maHang);
                }
              }}
              deleting={deleteMutation.isPending}
            />
          )}
        </div>
      </div>

      {formMode && (
        <VatTuFormPanel
          initial={formMode === "edit" ? selected : null}
          changedBy={changedBy}
          nhomOptions={nhomOptions.filter((n) => n !== "Tất cả nhóm")}
          onClose={() => setFormMode(null)}
          onSuccess={(maHang) => {
            setFormMode(null);
            setSelectedMaHang(maHang);
            invalidate();
          }}
        />
      )}
    </>
  );
}

function VatTuDetail({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: VatTuRow;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const low = item.soLuongTon <= item.minStock;
  const stockValue = item.soLuongTon * item.donGia;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          <VatTuThumbnail maHang={item.maHang} tenSanPham={item.tenSanPham} hinhAnh={item.hinhAnh} size="lg" />
          <div>
            <div className="font-mono text-[13px] text-primary font-semibold">{item.maHang}</div>
            <h2 className="text-[20px] font-semibold tracking-tight mt-1">{item.tenSanPham}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                {item.nhomHang ?? "—"}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                {item.donViTinh}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="h-9 px-3 rounded-lg border border-border bg-card text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-muted"
          >
            <Pencil className="size-3.5" /> Sửa
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="h-9 px-3 rounded-lg border border-destructive/30 text-destructive text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-destructive/10 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Xóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Boxes className="size-4" />}
          label="Tồn kho hiện tại"
          value={fmt(item.soLuongTon)}
          hint={item.donViTinh}
          tone={low ? "warning" : "primary"}
        />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="Ngưỡng tối thiểu"
          value={fmt(item.minStock)}
          hint="Cảnh báo khi tồn ≤ mức này"
          tone="warning"
        />
        <StatCard
          icon={<Package className="size-4" />}
          label="Giá trị tồn"
          value={`${fmt(Math.round(stockValue))} ₫`}
          hint={`Đơn giá ${fmt(item.donGia)} ₫`}
          tone="success"
        />
      </div>

      <div className="card-elevated overflow-hidden">
        <table className="w-full text-[13px]">
          <tbody>
            <DetailRow label="Mã hàng" value={item.maHang} mono />
            <DetailRow label="Tên vật tư" value={item.tenSanPham} />
            <DetailRow label="Nhóm hàng" value={item.nhomHang ?? "—"} />
            <DetailRow label="Đơn vị tính" value={item.donViTinh} />
            <DetailRow label="Đơn giá" value={`${fmt(item.donGia)} ₫`} />
            <DetailRow label="Tồn tối thiểu" value={fmt(item.minStock)} />
            <DetailRow label="Hình ảnh" value={item.hinhAnh ?? "—"} mono />
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-[12.5px] text-muted-foreground">
        <Boxes className="size-5 shrink-0 mt-0.5" />
        <p>
          Tồn kho chỉ thay đổi qua{" "}
          <Link to="/transactions" className="text-primary font-medium hover:underline">
            phiếu nhập / xuất / thu hồi
          </Link>
          . Xem tổng hợp tồn trên{" "}
          <Link to="/inventory" className="text-primary font-medium hover:underline">
            Quản lý kho
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="border-t border-border/60 first:border-t-0">
      <td className="px-4 py-3 text-muted-foreground w-[160px] text-[12px]">{label}</td>
      <td className={`px-4 py-3 font-medium ${mono ? "font-mono text-[12px]" : ""}`}>{value}</td>
    </tr>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "warning" | "success";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground/90",
    success: "bg-success/15 text-success-foreground/90",
  } as const;
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-muted-foreground font-medium">{label}</span>
        <span className={`size-7 rounded-lg grid place-items-center ${map[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-[20px] font-semibold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}
