import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Topbar } from "@/components/topbar";
import { useClientSession } from "@/lib/auth";
import { formatBoPhanLabel } from "@/lib/bo-phan";
import {
  createNhanVien,
  getBoPhanList,
  getNhanVienFullList,
  updateNhanVienFn,
} from "@/lib/api/master.functions";
import { getTienDoDinhMucByStaff } from "@/lib/api/quota.functions";
import type { NhanVienRow } from "@/lib/types/vpp";
import {
  Search,
  Plus,
  Shirt,
  Footprints,
  Building2,
  Pencil,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Nhân sự & Định mức – Stockflow" },
      { name: "description", content: "Quản lý nhân sự và theo dõi định mức cấp phát." },
    ],
  }),
  component: StaffPage,
});

const STAFF_KEYS = {
  list: ["nhan-vien-full"] as const,
  boPhan: ["bo-phan"] as const,
};

const AVATAR_TONES = [
  "from-[oklch(0.55_0.22_265)] to-[oklch(0.6_0.22_295)]",
  "from-[oklch(0.65_0.2_155)] to-[oklch(0.7_0.18_180)]",
  "from-[oklch(0.7_0.2_25)] to-[oklch(0.75_0.18_55)]",
  "from-[oklch(0.6_0.22_265)] to-[oklch(0.55_0.2_240)]",
  "from-[oklch(0.7_0.2_320)] to-[oklch(0.65_0.22_295)]",
  "from-[oklch(0.68_0.18_60)] to-[oklch(0.72_0.16_90)]",
];

const ALL_DEPTS = "Tất cả phòng ban";

function StaffPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: staff = [], isLoading, isError, error } = useQuery({
    queryKey: STAFF_KEYS.list,
    queryFn: () => getNhanVienFullList(),
  });
  const { data: boPhan = [] } = useQuery({
    queryKey: STAFF_KEYS.boPhan,
    queryFn: () => getBoPhanList(),
  });

  const [dept, setDept] = useState(ALL_DEPTS);
  const [q, setQ] = useState("");
  const [selectedMaNV, setSelectedMaNV] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);

  useEffect(() => {
    if (staff.length && !selectedMaNV) {
      setSelectedMaNV(staff[0].maNV);
    }
  }, [staff, selectedMaNV]);

  const rows = useMemo(() => {
    return staff.filter((s) => {
      if (dept !== ALL_DEPTS) {
        const label = s.tenBoPhan
          ? formatBoPhanLabel({ maBoPhan: s.maBoPhan, tenBoPhan: s.tenBoPhan })
          : null;
        if (label !== dept && s.tenBoPhan !== dept) return false;
      }
      if (q && !`${s.maNV} ${s.hoTen} ${s.chucDanh ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [staff, dept, q]);

  const deptOptions = useMemo(() => {
    const fromStaff = new Set(staff.map((s) => s.tenBoPhan).filter(Boolean) as string[]);
    const fromMaster = boPhan.map((b) => formatBoPhanLabel(b));
    return [ALL_DEPTS, ...Array.from(new Set([...fromMaster, ...fromStaff])).sort()];
  }, [staff, boPhan]);

  const selected = staff.find((s) => s.maNV === selectedMaNV) ?? rows[0];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: STAFF_KEYS.list });
    void queryClient.invalidateQueries({ queryKey: ["nhan-vien"] });
  };

  return (
    <>
      <Topbar title={t("pages.staff.title")} subtitle={t("pages.staff.subtitle")} />
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[440px_1fr] min-h-0">
        <div className="flex flex-col border-r border-border/70 bg-background/40 min-h-0">
          <div className="p-4 space-y-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border/70">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm tên, mã NV, chức danh…"
                  className="flex-1 bg-transparent outline-none text-[13px]"
                />
              </div>
              <button
                onClick={() => setFormMode("create")}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-primary-hover transition-colors shadow-[var(--shadow-glow)]"
              >
                <Plus className="size-3.5" /> Thêm NV
              </button>
            </div>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-card border border-border/70 text-[12.5px] outline-none focus:ring-2 focus:ring-primary/25"
            >
              {deptOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-[13px]">
                <Loader2 className="size-4 animate-spin" /> Đang tải nhân sự…
              </div>
            )}
            {isError && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/8 text-[12.5px] text-destructive flex gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error instanceof Error ? error.message : "Không tải được danh sách nhân sự"}</span>
              </div>
            )}
            {!isLoading && rows.length === 0 && (
              <p className="text-center text-[13px] text-muted-foreground py-8">Chưa có nhân viên. Bấm Thêm NV.</p>
            )}
            {rows.map((s, i) => (
              <button
                key={s.maNV}
                onClick={() => setSelectedMaNV(s.maNV)}
                style={{ animationDelay: `${i * 25}ms` }}
                className={[
                  "fluid-in w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3",
                  selected?.maNV === s.maNV
                    ? "bg-card border-primary/30 shadow-[var(--shadow-mica)]"
                    : "bg-card/60 border-border/60 hover:border-border hover:bg-card",
                ].join(" ")}
              >
                <div
                  className={`size-10 rounded-full bg-gradient-to-br ${avatarTone(s.id)} grid place-items-center text-[12.5px] font-semibold text-white shadow-sm shrink-0`}
                >
                  {initials(s.hoTen)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold tracking-tight truncate">{s.hoTen}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">{s.maNV}</span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{s.chucDanh ?? "— Chưa gán chức danh"}</div>
                  <div className="text-[10.5px] text-muted-foreground/80 mt-0.5 truncate">{s.tenBoPhan ?? "—"}</div>
                </div>
                {s.trangThai !== "Đang làm việc" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{s.trangThai}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto p-6">
          {selected ? (
            <StaffDetail
              s={selected}
              onEdit={() => setFormMode("edit")}
            />
          ) : (
            <div className="grid place-items-center h-full text-muted-foreground text-[13px]">Chọn nhân viên</div>
          )}
        </div>
      </div>

      {formMode && (
        <NhanVienFormPanel
          mode={formMode}
          initial={formMode === "edit" ? selected : undefined}
          boPhan={boPhan}
          onClose={() => setFormMode(null)}
          onSuccess={(maNV) => {
            setFormMode(null);
            setSelectedMaNV(maNV);
            invalidate();
          }}
        />
      )}
    </>
  );
}

function StaffDetail({ s, onEdit }: { s: NhanVienRow; onEdit: () => void }) {
  return (
    <div className="max-w-4xl mx-auto space-y-5 fluid-in">
      <div className="card-elevated p-6 flex items-center gap-5">
        <div
          className={`size-16 rounded-2xl bg-gradient-to-br ${avatarTone(s.id)} grid place-items-center text-[20px] font-semibold text-white shadow-[var(--shadow-glow)]`}
        >
          {initials(s.hoTen)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-[20px] font-semibold tracking-tight">{s.hoTen}</h1>
            <span className="font-mono text-[11.5px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">{s.maNV}</span>
            <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{s.trangThai}</span>
          </div>
          <div className="text-[12.5px] text-muted-foreground">{s.chucDanh ?? "Chưa gán chức danh"}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {s.tenBoPhan ?? "—"}</span>
            <span className="inline-flex items-center gap-1"><Shirt className="size-3" /> Size áo {s.sizeAo ?? "—"}</span>
            <span className="inline-flex items-center gap-1"><Footprints className="size-3" /> Size giày {s.sizeGiay ?? "—"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="h-9 px-3.5 rounded-lg border border-border bg-card text-[12.5px] font-semibold hover:bg-muted flex items-center gap-1.5"
          >
            <Pencil className="size-3.5" /> Sửa hồ sơ
          </button>
          <Link
            to="/audit-log"
            search={{ bang: "DanhMucNhanVien", ma: s.maNV }}
            className="h-9 px-3.5 rounded-lg border border-border bg-card text-[12.5px] font-semibold hover:bg-muted flex items-center gap-1.5"
          >
            <History className="size-3.5" /> Lịch sử thay đổi
          </Link>
          <Link
            to="/transactions"
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-hover transition-colors shadow-[var(--shadow-glow)] grid place-items-center"
          >
            Cấp phát mới
          </Link>
        </div>
      </div>

      <StaffQuotaProgress maNV={s.maNV} chucDanh={s.chucDanh} />
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function StaffQuotaProgress({ maNV, chucDanh }: { maNV: string; chucDanh: string | null }) {
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["tien-do-dinh-muc", maNV],
    queryFn: () => getTienDoDinhMucByStaff({ data: { maNV } }),
    enabled: !!maNV && !!chucDanh,
  });

  const totalQuota = items.reduce((a, r) => a + r.soLuongToiDa, 0);
  const totalUsed = items.reduce((a, r) => a + r.daDung, 0);
  const totalRemain = items.reduce((a, r) => a + Math.max(0, r.conLai), 0);

  if (!chucDanh) {
    return (
      <div className="card-elevated p-6 text-center text-[13px] text-muted-foreground">
        Nhân viên chưa có chức danh — không thể đối chiếu định mức.
        <Link to="/quotas" className="block mt-3 text-primary text-[12px] font-medium hover:underline">
          Cấu hình định mức hệ thống
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<ShieldCheck className="size-4" />}
          tone="primary"
          label="Hạng mục định mức"
          value={`${items.length} mặt hàng`}
          hint={`Chức danh: ${chucDanh}`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          label="Đã cấp tháng này"
          value={`${fmt(totalUsed)} đơn vị`}
          hint={totalQuota > 0 ? `Trên tổng ${fmt(totalQuota)} định mức` : "—"}
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4" />}
          tone="warning"
          label="Còn được lấy"
          value={`${fmt(totalRemain)} đơn vị`}
          hint="Tháng hiện tại"
        />
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight">Tiến độ định mức cấp phát</h2>
            <p className="text-[11.5px] text-muted-foreground">Tiêu hao tháng {new Date().getMonth() + 1}/{new Date().getFullYear()} (đã trừ thu hồi)</p>
          </div>
          <Link to="/quotas" className="text-[12px] text-primary font-medium hover:underline">
            Chỉnh sửa định mức
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-[13px]">
            <Loader2 className="size-4 animate-spin" /> Đang tải tiến độ…
          </div>
        )}
        {isError && (
          <p className="p-6 text-[13px] text-destructive">Không tải được tiến độ định mức. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.</p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="p-10 text-center text-[12.5px] text-muted-foreground">
            Chức danh <span className="font-semibold text-foreground">{chucDanh}</span> chưa được cấu hình hạn mức vật tư.
            <Link to="/quotas" className="block mt-3 text-primary font-medium hover:underline">
              Thêm định mức ngay
            </Link>
          </div>
        )}
        {!isLoading && items.length > 0 && (
          <div className="p-4 space-y-3">
            {items.map((item) => (
              <QuotaProgressRow key={item.maHang} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuotaProgressRow({ item }: { item: import("@/lib/types/vpp").TienDoDinhMucRow }) {
  const pct = Math.min(100, Math.round(item.phanTramDaDung));
  const over = item.daDung > item.soLuongToiDa;
  const barColor =
    over || pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary";

  return (
    <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
      <div className="flex justify-between items-start gap-2 text-[12.5px]">
        <div className="min-w-0">
          <div className="font-medium truncate">{item.tenSanPham}</div>
          <div className="text-[10.5px] text-muted-foreground font-mono">{item.maHang}</div>
        </div>
        <div className="text-right shrink-0 font-semibold tabular-nums">
          {fmt(item.daDung)} / {fmt(item.soLuongToiDa)} <span className="text-muted-foreground font-normal">{item.donViTinh}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
        <span>
          Còn lại: <strong className="text-foreground">{fmt(Math.max(item.conLai, 0))}</strong> {item.donViTinh}
        </span>
        {over || pct >= 100 ? (
          <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive text-[10px] font-semibold">Hết hạn mức</span>
        ) : (
          <span>Đã dùng {pct}%</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
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

function NhanVienFormPanel({
  mode,
  initial,
  boPhan,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  initial?: NhanVienRow;
  boPhan: { id: number; maBoPhan: string | null; tenBoPhan: string }[];
  onClose: () => void;
  onSuccess: (maNV: string) => void;
}) {
  const session = useClientSession();
  const changedBy = session?.displayName ?? session?.username ?? null;
  const [maNV, setMaNV] = useState(initial?.maNV ?? "");
  const [hoTen, setHoTen] = useState(initial?.hoTen ?? "");
  const [chucDanh, setChucDanh] = useState(initial?.chucDanh ?? "");
  const [boPhanId, setBoPhanId] = useState<string>(initial?.boPhanId ? String(initial.boPhanId) : "");
  const [sizeAo, setSizeAo] = useState(initial?.sizeAo ?? "");
  const [sizeGiay, setSizeGiay] = useState(initial?.sizeGiay ?? "");
  const [trangThai, setTrangThai] = useState(initial?.trangThai ?? "Đang làm việc");

  const createMutation = useMutation({
    mutationFn: () =>
      createNhanVien({
        data: {
          maNV,
          hoTen,
          chucDanh: chucDanh || null,
          boPhanId: boPhanId ? Number(boPhanId) : null,
          sizeAo: sizeAo || null,
          sizeGiay: sizeGiay || null,
          trangThai,
          changedBy,
        },
      }),
    onSuccess: () => {
      toast.success("Thêm nhân viên thành công");
      onSuccess(maNV.trim());
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Lỗi thêm nhân viên"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateNhanVienFn({
        data: {
          id: initial!.id,
          hoTen,
          chucDanh: chucDanh || null,
          boPhanId: boPhanId ? Number(boPhanId) : null,
          sizeAo: sizeAo || null,
          sizeGiay: sizeGiay || null,
          trangThai,
          changedBy,
        },
      }),
    onSuccess: () => {
      toast.success("Cập nhật nhân viên thành công");
      onSuccess(initial!.maNV);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Lỗi cập nhật"),
  });

  const pending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = hoTen.trim() && (mode === "edit" || maNV.trim()) && !pending;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-card shadow-[var(--shadow-mica-lg)] border-l border-border/70 flex flex-col fluid-in">
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{mode === "create" ? "Thêm nhân viên" : "Sửa hồ sơ"}</h2>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-muted text-muted-foreground">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {mode === "create" && (
            <Field label="Mã nhân viên">
              <input
                value={maNV}
                onChange={(e) => setMaNV(e.target.value)}
                placeholder="VD: NV0432"
                className={inputCls}
              />
            </Field>
          )}
          <Field label="Họ và tên">
            <input value={hoTen} onChange={(e) => setHoTen(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Chức danh / Vị trí">
            <input
              value={chucDanh}
              onChange={(e) => setChucDanh(e.target.value)}
              placeholder="VD: Công nhân sản xuất, NV văn phòng"
              className={inputCls}
            />
          </Field>
          <Field label="Phòng ban">
            <select value={boPhanId} onChange={(e) => setBoPhanId(e.target.value)} className={inputCls}>
              <option value="">— Chọn bộ phận —</option>
              {boPhan.map((b) => (
                <option key={b.id} value={b.id}>{formatBoPhanLabel(b)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size áo">
              <input value={sizeAo} onChange={(e) => setSizeAo(e.target.value)} placeholder="M, L, XL" className={inputCls} />
            </Field>
            <Field label="Size giày">
              <input value={sizeGiay} onChange={(e) => setSizeGiay(e.target.value)} placeholder="39, 42" className={inputCls} />
            </Field>
          </div>
          <Field label="Trạng thái">
            <select value={trangThai} onChange={(e) => setTrangThai(e.target.value)} className={inputCls}>
              <option value="Đang làm việc">Đang làm việc</option>
              <option value="Nghỉ việc">Nghỉ việc</option>
              <option value="Tạm nghỉ">Tạm nghỉ</option>
            </select>
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-border/70 flex gap-2 bg-muted/30">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-card text-[13px] font-medium hover:bg-muted">
            Hủy
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => (mode === "create" ? createMutation.mutate() : updateMutation.mutate())}
            className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "create" ? "Lưu nhân viên" : "Cập nhật"}
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

function avatarTone(id: number) {
  return AVATAR_TONES[id % AVATAR_TONES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
