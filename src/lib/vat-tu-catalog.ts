import { resolveVatTuImageUrl } from "./vat-tu-image";

export const PROD_MA_HANG_PREFIX = "PROD-";

export type MaHangCodeKind = "PROD" | "BHLD" | "CD" | "CUSTOM";

export const MA_HANG_CODE_KINDS: { id: MaHangCodeKind; label: string; hint: string }[] = [
  { id: "PROD", label: "VPP (PROD-)", hint: "Tự sinh PROD-0001, PROD-0002…" },
  { id: "BHLD", label: "BHLĐ (BHLD-)", hint: "Gợi ý BHLD-001 hoặc nhập tay BHLD-AO…" },
  { id: "CD", label: "Cược đồ (CD-)", hint: "Nhập mã đầy đủ, VD: CD-DP-M" },
  { id: "CUSTOM", label: "Mã khác", hint: "Nhập mã hàng tùy chỉnh" },
];

const MA_HANG_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,48}$/;

const NHOM_BY_KIND: Record<MaHangCodeKind, string> = {
  PROD: "Văn phòng phẩm",
  BHLD: "BHLD",
  CD: "Cược đồ",
  CUSTOM: "Khác",
};

export function isProdMaHang(maHang: string): boolean {
  return maHang.trim().toUpperCase().startsWith(PROD_MA_HANG_PREFIX);
}

export function normalizeMaHang(maHang: string): string {
  return maHang.trim().toUpperCase();
}

export function assertValidMaHang(maHang: string): string {
  const code = normalizeMaHang(maHang);
  if (!MA_HANG_PATTERN.test(code)) {
    throw new Error("Mã hàng không hợp lệ (chỉ dùng chữ, số và dấu gạch ngang).");
  }
  if (code.startsWith("DTRA-")) {
    throw new Error("Mã DTRA- không còn dùng. Hãy dùng mã CD- trong kho chung.");
  }
  return code;
}

export function inferCodeKind(maHang: string): MaHangCodeKind {
  const upper = normalizeMaHang(maHang);
  if (upper.startsWith("PROD-")) return "PROD";
  if (upper.startsWith("BHLD")) return "BHLD";
  if (upper.startsWith("CD-")) return "CD";
  return "CUSTOM";
}

export function defaultNhomHangForKind(kind: MaHangCodeKind): string {
  return NHOM_BY_KIND[kind];
}

export function defaultHinhAnhForMaHang(maHang: string): string {
  return resolveVatTuImageUrl(maHang, null);
}
