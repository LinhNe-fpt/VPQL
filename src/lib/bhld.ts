export const BHLD_RETURN_TAG = "đồ trả lại";

/** @deprecated Phiếu cũ có thể còn tag này */
export const BHLD_USED_TAG = "đã sử dụng";

/** Chuẩn hóa tag trạng thái thu hồi (sửa bản ghi lưu sai encoding trong SQL). */
export function formatBhldTrangThai(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if (v === BHLD_RETURN_TAG || v === BHLD_USED_TAG) return v;
  if (/Ã|�|tráº|tr��|l��/i.test(v)) return BHLD_RETURN_TAG;
  return v;
}

/** Tính số tháng sử dụng (khớp logic DATEDIFF MONTH trong SQL, tối thiểu 1). */
export function calcSoThangSuDung(ngayCap: string, ngayThuHoi: string): number {
  const from = parseDateInput(ngayCap);
  const to = parseDateInput(ngayThuHoi);
  if (!from || !to || to < from) return 1;

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 1) return 1;
  return months;
}

export function parseDateInput(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateVi(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseDateInput(value.includes("T") ? value.slice(0, 10) : value);
  if (!d) return value;
  return d.toLocaleDateString("vi-VN");
}
