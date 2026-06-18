/** @deprecated Import from @/lib/dong-phuc-catalog — giữ re-export cho tương thích. */
export {
  DONG_PHUC_CATALOG_KEY,
  DONG_PHUC_HANG_MUC as CUOC_DO_HANG_MUC,
  DONG_PHUC_SIZES as CUOC_DO_SIZES,
  getDongPhucHangMuc as getCuocDoHangMuc,
  type DongPhucSize as CuocDoSize,
  type CuocDoPhatLoai,
  maHangDongPhuc as maHangCuocDo,
  dongPhucSizeSortKey as sizeSortKey,
} from "./dong-phuc-catalog";

export const CUOC_DO_NHOM_HANG = "Cược đồ";

export type CuocDoLoai = "NV" | "CN" | "PB";

export type CuocDoVoucherType = "XUAT_CUOC_NV" | "XUAT_CUOC_CN" | "XUAT_CUOC_PB";

export function cuocDoLoaiToPhieu(loai: CuocDoLoai): CuocDoVoucherType {
  if (loai === "CN") return "XUAT_CUOC_CN";
  if (loai === "PB") return "XUAT_CUOC_PB";
  return "XUAT_CUOC_NV";
}

export function isCuocDoVoucherType(loai: string): loai is CuocDoVoucherType {
  return loai === "XUAT_CUOC_NV" || loai === "XUAT_CUOC_CN" || loai === "XUAT_CUOC_PB";
}
