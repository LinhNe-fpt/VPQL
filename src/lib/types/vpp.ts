export type VoucherType =
  | "NHAP"
  | "XUAT_CN"
  | "XUAT_PB"
  | "THU_HOI"
  | "THU_HOI_BHLD"
  | "XUAT_CUOC_NV"
  | "XUAT_CUOC_CN"
  | "XUAT_CUOC_PB";

export const VOUCHER_LABEL: Record<VoucherType, string> = {
  NHAP: "Phiếu Nhập – Nhà cung cấp",
  XUAT_CN: "Cấp phát – Cá nhân",
  XUAT_PB: "Cấp phát – Phòng ban",
  THU_HOI: "Thu hồi – Hoàn kho",
  THU_HOI_BHLD: "Thu hồi – Đồ lao động",
  XUAT_CUOC_NV: "Cược đồ – Nhân viên",
  XUAT_CUOC_CN: "Cược đồ – Công nhân",
  XUAT_CUOC_PB: "Cược đồ – Bộ phận",
};

export interface VatTuRow {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  nhomHang: string | null;
  donGia: number;
  minStock: number;
  soLuongTon: number;
  hinhAnh: string | null;
}

export interface BoPhanRow {
  id: number;
  maBoPhan: string | null;
  tenBoPhan: string;
}

export interface NhanVienRow {
  id: number;
  maNV: string;
  hoTen: string;
  chucDanh: string | null;
  boPhanId: number | null;
  maBoPhan: string | null;
  tenBoPhan: string | null;
  sizeAo: string | null;
  sizeGiay: string | null;
  trangThai: string;
}

export interface VoucherLine {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  hinhAnh?: string | null;
  ngayCap?: string | null;
  ngayThuHoi?: string | null;
  soThangSuDung?: number | null;
  trangThaiHang?: string | null;
  ghiChuDong?: string | null;
}

export interface VoucherSummary {
  id: number;
  soPhieu: string;
  loaiPhieu: VoucherType;
  ngayLap: string;
  nguoiLap: string | null;
  ghiChu: string | null;
  tenBoPhan: string | null;
  maBoPhan: string | null;
  maNV: string | null;
  hoTen: string | null;
  tenNguoiNhan: string | null;
  soNhanVienCap: number | null;
  lineCount: number;
  totalQty: number;
  recipient: string;
  department: string;
}

export interface VoucherDetail extends VoucherSummary {
  lines: VoucherLine[];
}

export interface DinhMucRow {
  chucDanh: string;
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  soLuongToiDa: number;
  ghiChu: string | null;
}

export interface TienDoDinhMucRow {
  nhanVienId: number;
  maNV: string;
  hoTen: string;
  chucDanh: string;
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  soLuongToiDa: number;
  daDung: number;
  conLai: number;
  phanTramDaDung: number;
}

/** Hàng cược đồ còn chưa thu hồi của một nhân viên (phục vụ form thu hồi). */
export interface HangDaCapThuHoiRow {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  soLuongConLai: number;
  ngayCapDau: string | null;
}

export interface ThuHoiNhanVienLookup {
  maNV: string;
  hoTen: string;
  chucDanh: string | null;
  maBoPhan: string | null;
  tenBoPhan: string | null;
}

export interface ThuHoiDaCapResult {
  nhanVien: ThuHoiNhanVienLookup | null;
  items: HangDaCapThuHoiRow[];
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLogEntry {
  id: number;
  batchId: string;
  bangDuLieu: string;
  tenBang: string;
  maBanGhi: string;
  hanhDong: AuditAction;
  hanhDongLabel: string;
  truongThayDoi: string;
  tenTruong: string;
  giaTriCu: string | null;
  giaTriMoi: string | null;
  nguoiThayDoi: string | null;
  ngayGio: string;
}

export interface AuditLogGroup {
  batchId: string;
  bangDuLieu: string;
  tenBang: string;
  maBanGhi: string;
  hanhDong: AuditAction;
  hanhDongLabel: string;
  nguoiThayDoi: string | null;
  ngayGio: string;
  fieldCount: number;
  changes: AuditLogEntry[];
}
