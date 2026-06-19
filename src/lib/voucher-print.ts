import type { VoucherType } from "@/lib/types/vpp";

export function getVoucherRecipientLabel(loaiPhieu: VoucherType): string {
  if (loaiPhieu === "NHAP") return "Nhà cung cấp";
  if (loaiPhieu === "THU_HOI_BHLD") return "Người / bộ phận trả";
  if (loaiPhieu === "THU_HOI") return "Nguồn thu hồi";
  if (loaiPhieu === "KIEM_KE") return "Loại phiếu";
  return "Người nhận";
}
