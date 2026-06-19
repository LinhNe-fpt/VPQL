import type { NhanVienRow } from "@/lib/types/vpp";

const fieldInputCls =
  "w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-primary/25";

export function NhanVienManualFields({
  listIdPrefix,
  nhanVien,
  maNV,
  hoTen,
  onMaNVChange,
  onHoTenChange,
  maNVLabel = "Mã nhân viên",
  hoTenLabel = "Họ và tên",
  maNVPlaceholder = "VD: NV001",
  hoTenPlaceholder = "Nhập họ tên",
  unmatchedMaNVHint = "Mã chưa khớp danh sách nhân sự — vui lòng kiểm tra lại trước khi lưu.",
}: {
  listIdPrefix: string;
  nhanVien: NhanVienRow[];
  maNV: string;
  hoTen: string;
  onMaNVChange: (maNV: string, hoTen?: string) => void;
  onHoTenChange: (hoTen: string, maNV?: string) => void;
  maNVLabel?: string;
  hoTenLabel?: string;
  maNVPlaceholder?: string;
  hoTenPlaceholder?: string;
  unmatchedMaNVHint?: string;
}) {
  const matched = nhanVien.find((n) => n.maNV.toUpperCase() === maNV.trim().toUpperCase());

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10.5px] text-muted-foreground font-medium mb-1 block">{maNVLabel}</span>
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
            placeholder={maNVPlaceholder}
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
          <span className="text-[10.5px] text-muted-foreground font-medium mb-1 block">{hoTenLabel}</span>
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
            placeholder={hoTenPlaceholder}
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
        <p className="text-[11px] text-warning-foreground/90">{unmatchedMaNVHint}</p>
      )}
    </div>
  );
}
