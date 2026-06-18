import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { useClientSession } from "@/lib/auth";
import { getVatTuList } from "@/lib/api/inventory.functions";
import {
  deleteDinhMucFn,
  getChucDanhOptions,
  getDinhMucList,
  upsertDinhMucFn,
} from "@/lib/api/quota.functions";
import type { DinhMucRow } from "@/lib/types/vpp";
import { Plus, Pencil, Trash2, Search, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotas")({
  head: () => ({
    meta: [
      { title: "Cấu hình Định mức – Stockflow" },
      { name: "description", content: "Cấu hình hạn mức cấp phát theo chức danh và mặt hàng." },
    ],
  }),
  component: QuotasPage,
});

const QUOTA_KEYS = {
  list: ["dinh-muc"] as const,
  chucDanh: ["chuc-danh-options"] as const,
  vatTu: ["vat-tu"] as const,
};

const DEFAULT_CHUC_DANH = ["Nhân viên văn phòng", "Công nhân sản xuất", "Kỹ sư chất lượng", "Thủ kho"];

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function QuotasPage() {
  const { t } = useTranslation();
  const session = useClientSession();
  const changedBy = session?.displayName ?? session?.username ?? null;
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: QUOTA_KEYS.list,
    queryFn: () => getDinhMucList(),
  });

  const [filterChucDanh, setFilterChucDanh] = useState("Tất cả chức danh");
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DinhMucRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterChucDanh !== "Tất cả chức danh" && r.chucDanh !== filterChucDanh) return false;
      if (q && !`${r.chucDanh} ${r.maHang} ${r.tenSanPham}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, filterChucDanh, q]);

  const chucDanhInData = useMemo(() => {
    return ["Tất cả chức danh", ...Array.from(new Set(rows.map((r) => r.chucDanh))).sort()];
  }, [rows]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: QUOTA_KEYS.list });

  const deleteMutation = useMutation({
    mutationFn: (row: DinhMucRow) =>
      deleteDinhMucFn({ data: { chucDanh: row.chucDanh, maHang: row.maHang, changedBy } }),
    onSuccess: () => {
      toast.success("Đã xóa cấu hình định mức");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không xóa được"),
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: DinhMucRow) {
    setEditing(row);
    setFormOpen(true);
  }

  return (
    <>
      <Topbar title={t("pages.quotas.title")} subtitle={t("pages.quotas.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="card-elevated p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-muted/60 border border-border/60 flex-1 min-w-[240px]">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm chức danh, mã hàng, tên SP…"
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
          </div>
          <select
            value={filterChucDanh}
            onChange={(e) => setFilterChucDanh(e.target.value)}
            className="h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] outline-none focus:ring-2 focus:ring-primary/25"
          >
            {chucDanhInData.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary-hover shadow-[var(--shadow-glow)]"
          >
            <Plus className="size-3.5" /> Thêm định mức
          </button>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-[13px]">
              <Loader2 className="size-4 animate-spin" /> Đang tải định mức…
            </div>
          )}
          {isError && (
            <div className="m-4 p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-destructive text-[12.5px] flex gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error instanceof Error ? error.message : "Không tải được danh sách định mức"}</span>
            </div>
          )}
          {!isLoading && !isError && (
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-md z-10 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold">Chức danh</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold">Mã hàng</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold">Tên sản phẩm</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold text-right">Số lượng tối đa / tháng</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold">Đơn vị</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold">Ghi chú</th>
                    <th className="px-4 py-2.5 text-[10.5px] uppercase font-semibold w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={`${row.chucDanh}-${row.maHang}`} className="border-t border-border/60 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{row.chucDanh}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-primary font-semibold">{row.maHang}</td>
                      <td className="px-4 py-3">{row.tenSanPham}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(row.soLuongToiDa)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.donViTinh}</td>
                      <td className="px-4 py-3 text-muted-foreground text-[12px] max-w-[200px] truncate">{row.ghiChu ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(row)}
                            className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
                            title="Sửa"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa định mức ${row.chucDanh} · ${row.maHang}?`)) {
                                deleteMutation.mutate(row);
                              }
                            }}
                            className="size-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-destructive"
                            title="Xóa"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-12">Chưa có định mức nào. Bấm Thêm định mức.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20 text-[12.5px] text-muted-foreground">
          <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
          <p>
            Định mức áp dụng khi lập phiếu <strong className="text-foreground">xuất cấp phát cá nhân</strong>.
            Hệ thống cộng dồn lượng đã cấp trong tháng (đã trừ thu hồi) và chặn nếu vượt hạn mức.
          </p>
        </div>
      </div>

      {formOpen && (
        <DinhMucFormPanel
          initial={editing}
          changedBy={changedBy}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            invalidate();
            void queryClient.invalidateQueries({ queryKey: QUOTA_KEYS.chucDanh });
          }}
        />
      )}
    </>
  );
}

function DinhMucFormPanel({
  initial,
  changedBy,
  onClose,
  onSuccess,
}: {
  initial: DinhMucRow | null;
  changedBy: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!initial;

  const { data: chucDanhFromDb = [] } = useQuery({
    queryKey: QUOTA_KEYS.chucDanh,
    queryFn: () => getChucDanhOptions(),
  });
  const { data: vatTu = [] } = useQuery({
    queryKey: QUOTA_KEYS.vatTu,
    queryFn: () => getVatTuList(),
  });

  const chucDanhOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CHUC_DANH, ...chucDanhFromDb])).sort();
  }, [chucDanhFromDb]);

  const [chucDanh, setChucDanh] = useState(initial?.chucDanh ?? chucDanhOptions[0] ?? "");
  const [maHang, setMaHang] = useState(initial?.maHang ?? "");
  const [soLuongToiDa, setSoLuongToiDa] = useState(initial?.soLuongToiDa ?? 1);
  const [ghiChu, setGhiChu] = useState(initial?.ghiChu ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      upsertDinhMucFn({
        data: {
          chucDanh,
          maHang,
          soLuongToiDa,
          ghiChu: ghiChu || null,
          changedBy,
        },
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Cập nhật định mức thành công" : "Thêm định mức thành công");
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Lỗi lưu định mức"),
  });

  const selectedVt = vatTu.find((v) => v.maHang === maHang);
  const canSubmit = chucDanh.trim() && maHang && soLuongToiDa > 0 && !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{isEdit ? "Sửa định mức" : "Thêm định mức"}</h2>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <Field label="Chức danh">
            {isEdit ? (
              <input value={chucDanh} readOnly className={inputCls + " opacity-70"} />
            ) : (
              <>
                <input
                  list="chuc-danh-datalist"
                  value={chucDanh}
                  onChange={(e) => setChucDanh(e.target.value)}
                  placeholder="Chọn hoặc gõ chức danh"
                  className={inputCls}
                />
                <datalist id="chuc-danh-datalist">
                  {chucDanhOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <Field label="Vật tư">
            <select
              value={maHang}
              onChange={(e) => setMaHang(e.target.value)}
              disabled={isEdit}
              className={inputCls + (isEdit ? " opacity-70" : "")}
            >
              <option value="">— Chọn mã hàng —</option>
              {vatTu.map((v) => (
                <option key={v.maHang} value={v.maHang}>
                  {v.maHang} — {v.tenSanPham}
                </option>
              ))}
            </select>
            {selectedVt && (
              <p className="text-[11px] text-muted-foreground mt-1">{selectedVt.donViTinh} · {selectedVt.nhomHang ?? "—"}</p>
            )}
          </Field>

          <Field label="Số lượng tối đa / tháng">
            <input
              type="number"
              min={0.01}
              step="any"
              value={soLuongToiDa}
              onChange={(e) => setSoLuongToiDa(Number(e.target.value))}
              className={inputCls}
            />
          </Field>

          <Field label="Ghi chú">
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className={inputCls + " resize-none h-auto py-2"}
              placeholder="VD: Định mức theo quy chế cấp phát 2026"
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
            className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Lưu định mức
          </button>
        </div>
      </aside>
    </div>
  );
}

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
