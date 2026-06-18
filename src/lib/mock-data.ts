export type Category = "VPP" | "BHLD" | "DONG_PHUC";

export interface InventoryItem {
  sku: string;
  name: string;
  category: Category;
  size?: string;
  unit: string;
  stock: number;
  minStock: number;
  location: string;
  unitPrice: number;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  VPP: "Văn phòng phẩm",
  BHLD: "Quần áo bảo hộ",
  DONG_PHUC: "Đồng phục công nhân",
};

const seed: Omit<InventoryItem, "sku">[] = [
  { name: "Bút bi Thiên Long TL-027", category: "VPP", unit: "Cây", stock: 412, minStock: 80, location: "Kệ A1-03", unitPrice: 4500 },
  { name: "Giấy A4 Double A 70gsm", category: "VPP", unit: "Ream", stock: 38, minStock: 50, location: "Kệ A2-01", unitPrice: 72000 },
  { name: "Kẹp bướm 32mm", category: "VPP", unit: "Hộp", stock: 124, minStock: 30, location: "Kệ A1-07", unitPrice: 18000 },
  { name: "Bìa còng A4 7cm", category: "VPP", unit: "Cái", stock: 56, minStock: 20, location: "Kệ A3-02", unitPrice: 42000 },
  { name: "Mực in HP 12A", category: "VPP", unit: "Hộp", stock: 9, minStock: 12, location: "Kệ A4-01", unitPrice: 850000 },
  { name: "Sổ ghi chép A5 200 trang", category: "VPP", unit: "Cuốn", stock: 210, minStock: 60, location: "Kệ A2-04", unitPrice: 28000 },
  { name: "Áo BHLĐ tay dài xanh", category: "BHLD", size: "M", unit: "Bộ", stock: 64, minStock: 40, location: "Kệ B1-01", unitPrice: 285000 },
  { name: "Áo BHLĐ tay dài xanh", category: "BHLD", size: "L", unit: "Bộ", stock: 45, minStock: 40, location: "Kệ B1-02", unitPrice: 285000 },
  { name: "Áo BHLĐ tay dài xanh", category: "BHLD", size: "XL", unit: "Bộ", stock: 22, minStock: 40, location: "Kệ B1-03", unitPrice: 285000 },
  { name: "Giày bảo hộ Jogger Bestrun", category: "BHLD", size: "42", unit: "Đôi", stock: 18, minStock: 25, location: "Kệ B2-01", unitPrice: 620000 },
  { name: "Mũ bảo hộ Proguard vàng", category: "BHLD", unit: "Cái", stock: 142, minStock: 80, location: "Kệ B3-01", unitPrice: 95000 },
  { name: "Kính bảo hộ 3M chống tia UV", category: "BHLD", unit: "Cái", stock: 76, minStock: 50, location: "Kệ B3-04", unitPrice: 135000 },
  { name: "Găng tay sợi phủ PU", category: "BHLD", size: "L", unit: "Đôi", stock: 320, minStock: 150, location: "Kệ B4-02", unitPrice: 18500 },
  { name: "Khẩu trang N95 3M", category: "BHLD", unit: "Hộp", stock: 14, minStock: 20, location: "Kệ B5-01", unitPrice: 320000 },
  { name: "Đồng phục công nhân tổ Cơ Khí", category: "DONG_PHUC", size: "M", unit: "Bộ", stock: 31, minStock: 25, location: "Kệ C1-01", unitPrice: 340000 },
  { name: "Đồng phục công nhân tổ Cơ Khí", category: "DONG_PHUC", size: "L", unit: "Bộ", stock: 27, minStock: 25, location: "Kệ C1-02", unitPrice: 340000 },
  { name: "Đồng phục văn phòng nữ Sơ mi", category: "DONG_PHUC", size: "S", unit: "Cái", stock: 19, minStock: 15, location: "Kệ C2-01", unitPrice: 220000 },
  { name: "Đồng phục văn phòng nữ Sơ mi", category: "DONG_PHUC", size: "M", unit: "Cái", stock: 24, minStock: 15, location: "Kệ C2-02", unitPrice: 220000 },
  { name: "Đồng phục bảo vệ mùa hè", category: "DONG_PHUC", size: "L", unit: "Bộ", stock: 12, minStock: 10, location: "Kệ C3-01", unitPrice: 380000 },
];

export const INVENTORY: InventoryItem[] = seed.map((s, i) => ({
  ...s,
  sku: `${s.category === "VPP" ? "VPP" : s.category === "BHLD" ? "BHL" : "DPH"}-${String(1001 + i).padStart(4, "0")}`,
}));

export type VoucherType = "NHAP" | "XUAT_CN" | "XUAT_PB";

export interface VoucherLine {
  sku: string;
  name: string;
  size?: string;
  qty: number;
  unit: string;
}

export interface Voucher {
  id: string;
  type: VoucherType;
  date: string;
  createdBy: string;
  recipient: string;
  recipientCode?: string;
  department: string;
  lines: VoucherLine[];
  note?: string;
}

export const VOUCHER_LABEL: Record<VoucherType, string> = {
  NHAP: "Phiếu Nhập – Nhà cung cấp",
  XUAT_CN: "Cấp phát – Cá nhân",
  XUAT_PB: "Cấp phát – Phòng ban",
};

export const VOUCHERS: Voucher[] = [
  {
    id: "PN-2026-00128",
    type: "NHAP",
    date: "2026-06-08 09:14",
    createdBy: "Nguyễn Thị Mai",
    recipient: "Công ty TNHH Bảo Hộ Á Châu",
    department: "Nhà cung cấp",
    lines: [
      { sku: "BHL-1007", name: "Áo BHLĐ tay dài xanh", size: "M", qty: 50, unit: "Bộ" },
      { sku: "BHL-1008", name: "Áo BHLĐ tay dài xanh", size: "L", qty: 50, unit: "Bộ" },
      { sku: "BHL-1011", name: "Mũ bảo hộ Proguard vàng", qty: 80, unit: "Cái" },
    ],
    note: "Đơn nhập theo HĐ #BHAC-2026/0521.",
  },
  {
    id: "PX-2026-00342",
    type: "XUAT_CN",
    date: "2026-06-09 08:32",
    createdBy: "Trần Văn Hùng",
    recipient: "Lê Quang Đạt",
    recipientCode: "NV0432",
    department: "Xưởng Sản Xuất 1",
    lines: [
      { sku: "BHL-1008", name: "Áo BHLĐ tay dài xanh", size: "L", qty: 2, unit: "Bộ" },
      { sku: "BHL-1010", name: "Giày bảo hộ Jogger Bestrun", size: "42", qty: 1, unit: "Đôi" },
      { sku: "BHL-1011", name: "Mũ bảo hộ Proguard vàng", qty: 1, unit: "Cái" },
    ],
  },
  {
    id: "PX-2026-00341",
    type: "XUAT_PB",
    date: "2026-06-08 16:05",
    createdBy: "Trần Văn Hùng",
    recipient: "Phòng Hành Chính",
    department: "Hành chính – Nhân sự",
    lines: [
      { sku: "VPP-1002", name: "Giấy A4 Double A 70gsm", qty: 12, unit: "Ream" },
      { sku: "VPP-1001", name: "Bút bi Thiên Long TL-027", qty: 40, unit: "Cây" },
      { sku: "VPP-1006", name: "Sổ ghi chép A5 200 trang", qty: 15, unit: "Cuốn" },
    ],
  },
  {
    id: "PX-2026-00340",
    type: "XUAT_CN",
    date: "2026-06-07 10:21",
    createdBy: "Nguyễn Thị Mai",
    recipient: "Phạm Minh Tuấn",
    recipientCode: "NV0218",
    department: "Xưởng Sản Xuất 2",
    lines: [
      { sku: "BHL-1013", name: "Găng tay sợi phủ PU", size: "L", qty: 4, unit: "Đôi" },
      { sku: "BHL-1012", name: "Kính bảo hộ 3M chống tia UV", qty: 1, unit: "Cái" },
    ],
  },
  {
    id: "PX-2026-00339",
    type: "XUAT_PB",
    date: "2026-06-06 14:48",
    createdBy: "Trần Văn Hùng",
    recipient: "Tổ Cơ Khí – Ca A",
    department: "Xưởng Sản Xuất 1",
    lines: [
      { sku: "DPH-1015", name: "Đồng phục công nhân tổ Cơ Khí", size: "M", qty: 6, unit: "Bộ" },
      { sku: "DPH-1016", name: "Đồng phục công nhân tổ Cơ Khí", size: "L", qty: 8, unit: "Bộ" },
    ],
  },
];
