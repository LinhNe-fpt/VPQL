import { DONG_PHUC_HANG_MUC, getDongPhucHangMuc, type DongPhucHangMuc } from "@/lib/dong-phuc-catalog";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import type { VatTuRow } from "@/lib/types/vpp";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function DongPhucCatalogGrid({
  vatTu,
  onPick,
  selectedMaHang,
  pickLabel = "Chọn",
  hangMuc,
}: {
  vatTu: VatTuRow[];
  onPick: (maHang: string) => void;
  selectedMaHang?: Set<string>;
  pickLabel?: string;
  hangMuc?: readonly DongPhucHangMuc[];
}) {
  const catalog = hangMuc ?? DONG_PHUC_HANG_MUC;
  return (
    <div className="space-y-3">
      {catalog.map((hm) => {
        const items = vatTu.filter(
          (v) => v.maHang === hm.maPrefix || v.maHang.startsWith(`${hm.maPrefix}-`),
        );
        if (items.length === 0) return null;
        return (
          <div key={hm.maPrefix}>
            <div className="text-[10.5px] font-semibold text-muted-foreground mb-1.5">{hm.ten}</div>
            <div className="flex flex-wrap gap-1">
              {items.map((v) => {
                const sizeLabel = v.maHang.includes("-") ? v.maHang.split("-").pop() : pickLabel;
                const active = selectedMaHang?.has(v.maHang);
                return (
                  <button
                    key={v.maHang}
                    type="button"
                    onClick={() => onPick(v.maHang)}
                    title={`${v.tenSanPham} · Tồn kho: ${fmt(v.soLuongTon)}`}
                    className={[
                      "flex flex-col items-center gap-1 p-1.5 rounded-lg border min-w-[3.25rem] transition-colors",
                      active
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-900"
                        : "border-border/70 hover:bg-muted/80",
                    ].join(" ")}
                  >
                    <VatTuThumbnail maHang={v.maHang} tenSanPham={v.tenSanPham} hinhAnh={v.hinhAnh} size="sm" />
                    <span className="text-[10px] font-semibold leading-none">{sizeLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
