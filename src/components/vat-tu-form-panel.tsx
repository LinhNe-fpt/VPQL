import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VatTuImagePicker } from "@/components/vat-tu-image-picker";
import { createVatTu, suggestMaHang, updateVatTuFn } from "@/lib/api/product.functions";
import type { VatTuRow } from "@/lib/types/vpp";
import {
  defaultHinhAnhForMaHang,
  defaultNhomHangForKind,
  inferCodeKind,
  MA_HANG_CODE_KINDS,
  type MaHangCodeKind,
} from "@/lib/vat-tu-catalog";
import { Loader2 } from "lucide-react";

export const DON_VI_OPTIONS = ["Cây", "Ream", "Hộp", "Cái", "Cuốn", "Bộ", "Đôi", "Kg", "Lít"];

const inputCls =
  "w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function VatTuFormPanel({
  initial,
  changedBy,
  nhomOptions = [],
  onClose,
  onSuccess,
}: {
  initial: VatTuRow | null;
  changedBy: string | null;
  nhomOptions?: string[];
  onClose: () => void;
  onSuccess: (maHang: string) => void;
}) {
  const isEdit = !!initial;
  const queryClient = useQueryClient();

  const [codeKind, setCodeKind] = useState<MaHangCodeKind>(
    initial ? inferCodeKind(initial.maHang) : "PROD",
  );
  const [maHang, setMaHang] = useState(initial?.maHang ?? "");
  const [tenSanPham, setTenSanPham] = useState(initial?.tenSanPham ?? "");
  const [donViTinh, setDonViTinh] = useState(initial?.donViTinh ?? DON_VI_OPTIONS[0]);
  const [nhomHang, setNhomHang] = useState(initial?.nhomHang ?? defaultNhomHangForKind("PROD"));
  const [donGia, setDonGia] = useState(initial?.donGia ?? 0);
  const [minStock, setMinStock] = useState(initial?.minStock ?? 0);
  const [hinhAnh, setHinhAnh] = useState(
    initial?.hinhAnh ?? defaultHinhAnhForMaHang(initial?.maHang ?? "PROD-0001"),
  );

  const autoSuggest = codeKind === "PROD" || codeKind === "BHLD";

  const { data: suggestedCode, isLoading: loadingSuggest } = useQuery({
    queryKey: ["suggest-ma-hang", codeKind],
    queryFn: () => suggestMaHang({ data: { prefix: codeKind as "PROD" | "BHLD" } }),
    enabled: !isEdit && autoSuggest,
  });

  useEffect(() => {
    if (isEdit || !autoSuggest) return;
    if (suggestedCode) setMaHang(suggestedCode);
  }, [isEdit, autoSuggest, suggestedCode]);

  function handleKindChange(kind: MaHangCodeKind) {
    setCodeKind(kind);
    setNhomHang(defaultNhomHangForKind(kind));
    if (kind === "CD") {
      setMaHang("CD-");
      setHinhAnh(defaultHinhAnhForMaHang("CD-DP"));
    } else if (kind === "CUSTOM") {
      setMaHang("");
      setHinhAnh(defaultHinhAnhForMaHang("ITEM"));
    } else {
      setMaHang("");
      void queryClient.invalidateQueries({ queryKey: ["suggest-ma-hang", kind] });
    }
  }

  const resolvedMaHang = maHang.trim().toUpperCase();
  const maHangReadOnly = isEdit || (autoSuggest && loadingSuggest);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        maHang: resolvedMaHang,
        tenSanPham,
        donViTinh,
        nhomHang: nhomHang || null,
        donGia,
        minStock,
        hinhAnh: hinhAnh || null,
        changedBy,
      };
      return isEdit ? updateVatTuFn({ data: payload }) : createVatTu({ data: payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cập nhật vật tư thành công" : "Thêm vật tư thành công");
      onSuccess(resolvedMaHang);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Lỗi lưu vật tư"),
  });

  const canSubmit =
    resolvedMaHang &&
    tenSanPham.trim() &&
    donViTinh.trim() &&
    !mutation.isPending &&
    (isEdit || !autoSuggest || !loadingSuggest);

  const nhomSelectOptions = Array.from(
    new Set([...nhomOptions, defaultNhomHangForKind(codeKind), nhomHang].filter(Boolean)),
  ).sort();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[440px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">{isEdit ? "Sửa vật tư" : "Thêm vật tư kho"}</h2>
            <p className="text-[11.5px] text-muted-foreground">PROD · BHLD · CD · mã tùy chỉnh — tồn ban đầu = 0</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {!isEdit && (
            <Field label="Loại mã hàng">
              <select
                value={codeKind}
                onChange={(e) => handleKindChange(e.target.value as MaHangCodeKind)}
                className={inputCls}
              >
                {MA_HANG_CODE_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {MA_HANG_CODE_KINDS.find((k) => k.id === codeKind)?.hint}
              </p>
            </Field>
          )}

          <Field label="Mã hàng">
            <div className="flex gap-2">
              <input
                value={maHangReadOnly && !isEdit && loadingSuggest ? "Đang gợi ý mã…" : maHang}
                onChange={(e) => setMaHang(e.target.value.toUpperCase())}
                readOnly={isEdit || (autoSuggest && !isEdit)}
                placeholder={codeKind === "CD" ? "CD-DP-M" : codeKind === "CUSTOM" ? "Mã tùy chỉnh" : ""}
                className={inputCls + " font-mono text-primary flex-1"}
              />
              {!isEdit && autoSuggest && (
                <button
                  type="button"
                  onClick={() => void queryClient.invalidateQueries({ queryKey: ["suggest-ma-hang", codeKind] })}
                  className="h-10 px-3 rounded-lg border border-border text-[12px] font-medium hover:bg-muted shrink-0"
                >
                  Gợi ý
                </button>
              )}
            </div>
          </Field>

          <Field label="Tên sản phẩm / vật tư">
            <input
              value={tenSanPham}
              onChange={(e) => setTenSanPham(e.target.value)}
              placeholder="VD: Bút bi Thiên Long TL-027"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn vị tính">
              <select value={donViTinh} onChange={(e) => setDonViTinh(e.target.value)} className={inputCls}>
                {DON_VI_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="Nhóm hàng">
              <input
                list="nhom-hang-options"
                value={nhomHang}
                onChange={(e) => setNhomHang(e.target.value)}
                className={inputCls}
              />
              <datalist id="nhom-hang-options">
                {nhomSelectOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn giá (₫)">
              <input
                type="number"
                min={0}
                value={donGia}
                onChange={(e) => setDonGia(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Tồn tối thiểu">
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Hình ảnh">
            <VatTuImagePicker
              maHang={resolvedMaHang}
              tenSanPham={tenSanPham}
              value={hinhAnh}
              onChange={setHinhAnh}
            />
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex gap-2 bg-muted/30">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            Hủy
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Lưu thay đổi" : "Thêm vật tư"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/** @deprecated Dùng VatTuFormPanel */
export const ProdFormPanel = VatTuFormPanel;
