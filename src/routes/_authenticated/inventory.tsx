import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Topbar } from "@/components/topbar";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { getVatTuList } from "@/lib/api/inventory.functions";
import { isProdMaHang } from "@/lib/vat-tu-catalog";
import { History, Loader2, AlertCircle, Search, Package, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Quản lý Kho – Stockflow" },
      { name: "description", content: "Danh mục vật tư và tồn kho hiện tại." },
    ],
  }),
  component: InventoryPage,
});

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function InventoryPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ["vat-tu"],
    queryFn: () => getVatTuList(),
  });

  const nhomOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.nhomHang).filter(Boolean) as string[]);
    return ["ALL", "PROD", ...Array.from(set).sort()];
  }, [items]);

  const rows = useMemo(() => {
    return items.filter((i) => {
      if (filter === "PROD" && !isProdMaHang(i.maHang)) return false;
      if (filter !== "ALL" && filter !== "PROD" && i.nhomHang !== filter) return false;
      if (q && !`${i.maHang} ${i.tenSanPham} ${i.nhomHang ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, q]);

  const totalValue = items.reduce((s, i) => s + i.soLuongTon * i.donGia, 0);
  const lowStock = items.filter((i) => i.soLuongTon <= i.minStock).length;
  const prodCount = items.filter((i) => isProdMaHang(i.maHang)).length;

  return (
    <>
      <Topbar title={t("pages.inventory.title")} subtitle={t("pages.inventory.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MiniStat label="Tổng mã hàng" value={fmt(items.length)} hint="Trong danh mục" />
          <MiniStat label="Sản phẩm PROD" value={fmt(prodCount)} hint="Vật tư kho quản lý" />
          <MiniStat label="Sắp hết kho" value={fmt(lowStock)} hint="Dưới ngưỡng tối thiểu" tone="warning" />
          <MiniStat label="Giá trị tồn kho" value={`${fmt(Math.round(totalValue / 1_000_000))}M ₫`} hint="Tồn × đơn giá" />
        </div>

        <div className="card-elevated p-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[260px]">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã hàng, tên sản phẩm, nhóm hàng…"
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/60 flex-wrap">
            {nhomOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "px-3 h-7 rounded-md text-[12.5px] font-medium transition-all duration-200",
                  filter === f ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {f === "ALL" ? "Tất cả" : f === "PROD" ? "PROD" : f}
              </button>
            ))}
          </div>
          <Link
            to="/products"
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary-hover shadow-[var(--shadow-glow)]"
          >
            <Plus className="size-3.5" /> Danh mục vật tư
          </Link>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-[13px]">
              <Loader2 className="size-4 animate-spin" /> Đang tải tồn kho…
            </div>
          )}
          {isError && (
            <div className="m-4 p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-[12.5px] text-destructive flex gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error instanceof Error ? error.message : "Không tải được dữ liệu kho"}</span>
            </div>
          )}
          {!isLoading && !isError && (
            <div className="overflow-auto max-h-[calc(100vh-340px)]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10">
                  <tr className="text-left text-muted-foreground">
                    <Th className="w-14">Ảnh</Th>
                    <Th>Mã hàng</Th>
                    <Th>Tên sản phẩm</Th>
                    <Th>Nhóm hàng</Th>
                    <Th>Đơn vị</Th>
                    <Th className="text-right">Tồn kho</Th>
                    <Th className="text-right">Tối thiểu</Th>
                    <Th className="text-right">Đơn giá</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i, idx) => {
                    const low = i.soLuongTon <= i.minStock;
                    const isSelected = selected === i.maHang;
                    return (
                      <tr
                        key={i.maHang}
                        onClick={() => setSelected(i.maHang)}
                        style={{ animationDelay: `${idx * 12}ms` }}
                        className={[
                          "fluid-in border-t border-border/60 cursor-pointer transition-colors",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        ].join(" ")}
                      >
                        <Td>
                          <VatTuThumbnail maHang={i.maHang} tenSanPham={i.tenSanPham} hinhAnh={i.hinhAnh} size="sm" />
                        </Td>
                        <Td className="font-mono text-[12px] text-primary font-semibold">{i.maHang}</Td>
                        <Td className="font-medium">{i.tenSanPham}</Td>
                        <Td>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
                            {i.nhomHang ?? "—"}
                          </span>
                        </Td>
                        <Td className="text-muted-foreground">{i.donViTinh}</Td>
                        <Td className="text-right">
                          <span
                            className={[
                              "inline-flex items-center justify-end px-2 py-0.5 rounded-md font-semibold tabular-nums",
                              low ? "bg-warning/15 text-warning-foreground/90" : "text-foreground",
                            ].join(" ")}
                          >
                            {fmt(i.soLuongTon)}
                          </span>
                        </Td>
                        <Td className="text-right text-muted-foreground tabular-nums">{fmt(i.minStock)}</Td>
                        <Td className="text-right tabular-nums text-muted-foreground">{fmt(i.donGia)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20 text-[12.5px] text-muted-foreground">
          <Package className="size-5 text-primary shrink-0 mt-0.5" />
          <p>
            Tồn kho chỉ thay đổi qua phiếu nhập, xuất hoặc thu hồi. Thêm/sửa/xóa vật tư tại{" "}
            <Link to="/products" className="text-primary font-medium hover:underline">
              Danh mục vật tư
            </Link>
            .
          </p>
        </div>
      </div>

            {selected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 fluid-in">
          <div className="mica rounded-2xl shadow-[var(--shadow-mica-lg)] px-3 py-2 flex items-center gap-1">
            <div className="px-3 text-[12.5px]">
              <span className="text-muted-foreground">Đã chọn </span>
              <span className="font-semibold text-primary font-mono">{selected}</span>
            </div>
            <div className="h-6 w-px bg-border mx-1" />
            <Link
              to="/products"
              className="h-8 px-2.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 hover:bg-muted/80 text-foreground/80"
            >
              <Package className="size-3.5" /> Mở danh mục
            </Link>
            <div className="h-6 w-px bg-border mx-1" />
            <button className="h-8 px-2.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 hover:bg-muted/80 text-foreground/80">
              <History className="size-3.5" /> Xem lịch sử biến động
            </button>
            <button onClick={() => setSelected(null)} className="ml-1 size-7 rounded-md hover:bg-muted text-muted-foreground text-[14px]">×</button>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2.5 ${className}`}>{children}</td>;
}

function MiniStat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "warning" }) {
  return (
    <div className="card-elevated p-4 fluid-in">
      <div className="text-[11.5px] text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1.5 text-[22px] font-semibold tracking-tight ${tone === "warning" ? "text-warning-foreground/90" : ""}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
