/** Danh mục & mã hàng đồng phục — nguồn chung cho kho, cấp phát, thu hồi. */

export const DONG_PHUC_CATALOG_KEY = ["dong-phuc-catalog"] as const;

export const DONG_PHUC_MA_PREFIX = "CD-";

export const DONG_PHUC_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

export type DongPhucSize = (typeof DONG_PHUC_SIZES)[number];

export type CuocDoPhatLoai = "NV" | "CN" | "PB";

export type DongPhucHangMuc = {
  maPrefix: string;
  ten: string;
  coSize: boolean;
  /** Không khai báo = hiện mọi loại phiếu */
  loai?: readonly CuocDoPhatLoai[];
};

export const DONG_PHUC_HANG_MUC: readonly DongPhucHangMuc[] = [
  { maPrefix: "CD-DP", ten: "Áo đồng phục", coSize: true, loai: ["CN", "PB"] },
  { maPrefix: "CD-GILE", ten: "Áo gile", coSize: true, loai: ["NV", "PB"] },
  { maPrefix: "CD-DTD", ten: "Dép tĩnh điện", coSize: false },
  { maPrefix: "CD-CKTU", ten: "Chìa khóa tủ", coSize: false },
  { maPrefix: "CD-THE", ten: "Thẻ nhân viên", coSize: false },
  { maPrefix: "CD-ABH", ten: "Áo bảo hộ", coSize: true },
];

export const DONG_PHUC_PREFIX_ORDER = DONG_PHUC_HANG_MUC.map((h) => h.maPrefix);

/** Danh mục theo loại phiếu — NV/PB: áo gile (+ PB còn áo đồng phục); CN: áo đồng phục. */
export function getDongPhucHangMuc(loai: CuocDoPhatLoai | "ALL" = "ALL"): DongPhucHangMuc[] {
  if (loai === "ALL") return [...DONG_PHUC_HANG_MUC];
  return DONG_PHUC_HANG_MUC.filter((h) => !h.loai || h.loai.includes(loai));
}

export function maHangDongPhuc(maPrefix: string, size?: string): string {
  return size ? `${maPrefix}-${size}` : maPrefix;
}

export function isDongPhucMaHang(maHang: string): boolean {
  return maHang.startsWith(DONG_PHUC_MA_PREFIX);
}

export function dongPhucSizeSortKey(maHang: string): number {
  const part = maHang.split("-").pop() ?? "";
  const idx = DONG_PHUC_SIZES.indexOf(part as DongPhucSize);
  return idx >= 0 ? idx : 99;
}
