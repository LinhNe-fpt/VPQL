import { DONG_PHUC_HANG_MUC } from "./dong-phuc-catalog";

/** Bộ phận — map theo mã (ổn định, không phụ thuộc DB encoding). */
export const BO_PHAN_TEN: Record<string, string> = {
  HG: "Hành chính nhân sự",
  EQM: "Thiết bị",
  SX: "Sản xuất",
  MM: "Kho MM",
  SM: "Kho shipment",
  CS: "Chất lượng",
  QC: "QC",
};

const PROD_BY_MA: Record<string, { ten: string; dvt: string; nhom: string }> = {
  "PROD-0001": { ten: "Bút bi Thiên Long TL-027", dvt: "Cây", nhom: "Văn phòng phẩm" },
  "PROD-0002": { ten: "Giấy A4 Double A 70gsm", dvt: "Ream", nhom: "Văn phòng phẩm" },
  "PROD-0003": { ten: "Kẹp bướm 32mm", dvt: "Hộp", nhom: "Văn phòng phẩm" },
  "PROD-0004": { ten: "Bìa còng A4 7cm", dvt: "Cái", nhom: "Văn phòng phẩm" },
  "PROD-0005": { ten: "Mực in HP 12A", dvt: "Hộp", nhom: "Văn phòng phẩm" },
  "PROD-0006": { ten: "Sổ ghi chép A5 200 trang", dvt: "Cuốn", nhom: "Văn phòng phẩm" },
};

const BHLD_BY_MA: Record<string, { ten: string; dvt: string }> = {
  "BHLD-AO": { ten: "Áo bảo hộ lao động", dvt: "Cái" },
  "BHLD-GANG": { ten: "Găng tay bảo hộ", dvt: "Đôi" },
  "BHLD-MU": { ten: "Mũ bảo hộ", dvt: "Cái" },
  "BHLD-KINH": { ten: "Kính bảo hộ", dvt: "Cái" },
  "BHLD-GIAY": { ten: "Giày bảo hộ", dvt: "Đôi" },
};

const CD_LEGACY: Record<string, { ten: string; dvt: string }> = {
  "CD-AO-NV-M": { ten: "Áo cược đồ nhân viên nam M", dvt: "Bộ" },
  "CD-AO-CN-L": { ten: "Áo cược đồ công nhân L", dvt: "Bộ" },
  "CD-GIAY-CN-42": { ten: "Giày bảo hộ công nhân 42", dvt: "Đôi" },
};

const MOJIBAKE_RE = /Bá»|á»|»™|Cuá»|c dá»|Ã|Â|�|ï¿½|tráº|ph\?|Cu\?c|Van ph|B\?\?T|B\?[^o]|C\?i|D\?p|Gi\?y|Th\?|Ch\?a|H\?nh|C\?ng nh|Nh\?n vi|b\?o h\?|d\?ng ph\?c/i;

export function hasBrokenVietnamese(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return MOJIBAKE_RE.test(text);
}

function lookupCuocDoTen(maHang: string): string | null {
  const upper = maHang.toUpperCase();
  for (const hm of DONG_PHUC_HANG_MUC) {
    if (upper === hm.maPrefix) return hm.ten;
    if (upper.startsWith(`${hm.maPrefix}-`)) {
      const size = maHang.slice(hm.maPrefix.length + 1);
      return `${hm.ten} size ${size}`;
    }
  }
  return null;
}

function lookupCatalog(maHang: string): { ten: string; dvt: string; nhom?: string } | null {
  const upper = maHang.toUpperCase();
  if (PROD_BY_MA[upper]) return PROD_BY_MA[upper];
  if (BHLD_BY_MA[upper]) return { ...BHLD_BY_MA[upper], nhom: "BHLĐ" };
  if (CD_LEGACY[upper]) return { ...CD_LEGACY[upper], nhom: "Cược đồ" };
  const cdTen = lookupCuocDoTen(maHang);
  if (cdTen) {
    let dvt = "Bộ";
    if (upper === "CD-DTD" || upper.startsWith("CD-GIAY")) dvt = "Đôi";
    else if (upper === "CD-THE" || upper === "CD-CKTU") dvt = "Cái";
    return { ten: cdTen, dvt, nhom: "Cược đồ" };
  }
  return null;
}

/** Tên vật tư — ưu tiên catalog theo mã hàng. */
export function resolveTenSanPham(maHang: string, tenSanPham: string): string {
  const hit = lookupCatalog(maHang);
  if (hit) return hit.ten;
  return hasBrokenVietnamese(tenSanPham) ? tenSanPham.replace(/\?+/g, "").trim() || maHang : tenSanPham;
}

/** Đơn vị tính — ưu tiên catalog theo mã hàng. */
export function resolveDonViTinh(maHang: string, donViTinh: string): string {
  const hit = lookupCatalog(maHang);
  if (hit) return hit.dvt;
  if (hasBrokenVietnamese(donViTinh)) {
    const upper = maHang.toUpperCase();
    if (upper.startsWith("CD-")) return upper === "CD-DTD" || upper.startsWith("CD-GIAY") ? "Đôi" : upper === "CD-THE" || upper === "CD-CKTU" ? "Cái" : "Bộ";
    if (upper.startsWith("PROD-")) return "Cái";
  }
  return donViTinh;
}

/** Nhóm hàng — ưu tiên catalog theo mã hàng. */
export function resolveNhomHang(maHang: string, nhomHang: string | null): string | null {
  const hit = lookupCatalog(maHang);
  if (hit?.nhom) return hit.nhom;
  if (!nhomHang) return null;
  if (hasBrokenVietnamese(nhomHang)) {
    const upper = maHang.toUpperCase();
    if (upper.startsWith("CD-")) return "Cược đồ";
    if (upper.startsWith("PROD-")) return "Văn phòng phẩm";
    if (upper.startsWith("BHLD")) return "BHLĐ";
  }
  return nhomHang;
}

export function resolveTenBoPhan(maBoPhan: string | null | undefined, tenBoPhan: string | null | undefined): string | null {
  if (!maBoPhan) return tenBoPhan ?? null;
  const fixed = BO_PHAN_TEN[maBoPhan.toUpperCase()];
  if (fixed) return fixed;
  return hasBrokenVietnamese(tenBoPhan) ? tenBoPhan ?? null : tenBoPhan ?? null;
}

const NV_HOTEN: Record<string, string> = {
  NV001: "Nguyễn Văn An",
  CN001: "Trần Văn Bình",
};

const NV_CHUCDANH: Record<string, string> = {
  NV001: "Nhân viên văn phòng",
  CN001: "Công nhân sản xuất",
};

export function resolveHoTen(maNV: string, hoTen: string): string {
  const fixed = NV_HOTEN[maNV.toUpperCase()];
  if (fixed) return fixed;
  return hasBrokenVietnamese(hoTen) ? hoTen : hoTen;
}

export function resolveChucDanhLabel(chucDanh: string | null | undefined): string | null {
  if (!chucDanh?.trim()) return null;
  const s = chucDanh;
  if (/c.{0,3}ng.{0,3}nh.{0,3}n/i.test(s) && /s.{0,3}n.{0,3}xu.{0,3}t/i.test(s)) {
    return "Công nhân sản xuất";
  }
  if (/nh.{0,3}n.{0,3}vi.{0,3}n/i.test(s) && /v.{0,3}n.{0,3}ph.{0,3}ng/i.test(s)) {
    return "Nhân viên văn phòng";
  }
  if (/k.{0,3}s.{0,3}u/i.test(s) && /ch.{0,3}t.{0,3}l.{0,3}ng/i.test(s)) {
    return "Kỹ sư chất lượng";
  }
  if (/th.{0,3}kho/i.test(s)) {
    return "Thủ kho";
  }
  return hasBrokenVietnamese(chucDanh) ? chucDanh : chucDanh;
}

const DINH_MUC_GHI_CHU_BY_MA: Record<string, string> = {
  "CD-DTD": "Dép / năm",
  "CD-THE": "Thẻ NV / năm",
  "CD-CKTU": "Chìa khóa tủ / năm",
  "CD-AO-NV-M": "Định mức cược đồ / năm",
  "CD-AO-CN-L": "Định mức cược đồ / năm",
  "CD-GIAY-CN-42": "Định mức cược đồ / năm",
  NOV0400: "Định mức găng tay bảo hộ hàng tháng",
  NOV1364: "Định mức giấy in A4 hàng tháng",
};

/** Ghi chú định mức — ưu tiên map theo mã hàng. */
export function resolveDinhMucGhiChu(maHang: string, ghiChu: string | null | undefined): string | null {
  const upper = maHang.toUpperCase();
  if (DINH_MUC_GHI_CHU_BY_MA[upper]) return DINH_MUC_GHI_CHU_BY_MA[upper];
  if (upper.startsWith("CD-GILE-")) return "Áo gile / năm";
  if (upper.startsWith("CD-DP-")) return "Áo đồng phục / năm";

  if (!ghiChu?.trim()) return null;
  if (!hasBrokenVietnamese(ghiChu)) return ghiChu;

  const g = ghiChu;
  if (/gile/i.test(g)) return "Áo gile / năm";
  if (/ng ph|c|dp|dong phuc/i.test(g)) return "Áo đồng phục / năm";
  if (/dep|dtd/i.test(g)) return "Dép / năm";
  if (/th.*nv|the/i.test(g)) return "Thẻ NV / năm";
  if (/kh.*a|cktu|chia khoa/i.test(g)) return "Chìa khóa tủ / năm";
  if (/gang tay|g?ng tay/i.test(g)) return "Định mức găng tay bảo hộ hàng tháng";
  if (/gi.*y in|giay in/i.test(g)) return "Định mức giấy in A4 hàng tháng";
  if (/cu?c d?|cuoc do/i.test(g)) return "Định mức cược đồ / năm";
  return ghiChu;
}

export function resolveChucDanh(maNV: string, chucDanh: string | null): string | null {
  const fixed = NV_CHUCDANH[maNV.toUpperCase()];
  if (fixed) return fixed;
  return resolveChucDanhLabel(chucDanh);
}

export function resolveTrangThai(trangThai: string | null | undefined): string {
  if (!trangThai?.trim()) return "Đang làm việc";
  if (hasBrokenVietnamese(trangThai) || trangThai.includes("ngh")) {
    if (/ngh/i.test(trangThai)) return "Nghỉ việc";
    return "Đang làm việc";
  }
  return trangThai;
}
