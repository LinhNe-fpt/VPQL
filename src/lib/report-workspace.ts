import type { ReportLineRow } from "./vpp-queries.server";
import { boPhanSortKey, formatBoPhanLabel } from "./bo-phan";
import type { BoPhanRow, TienDoDinhMucRow, VatTuRow, VoucherSummary } from "./types/vpp";
import { BO_PHAN_TEN } from "./vietnamese-text";

export type ReportTemplateId = "executive" | "transactions" | "inventory" | "distribution";

export interface ReportTemplate {
  id: ReportTemplateId;
  label: string;
  description: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "executive",
    label: "Tổng hợp quản trị",
    description: "KPI nhập–xuất, top hàng, phân bổ bộ phận — phù hợp trình ban lãnh đạo",
  },
  {
    id: "transactions",
    label: "Chi tiết giao dịch",
    description: "Danh sách phiếu và từng dòng hàng trong kỳ",
  },
  {
    id: "inventory",
    label: "Tồn kho & cảnh báo",
    description: "Tình trạng tồn, giá trị kho và hàng sắp hết mức tối thiểu",
  },
  {
    id: "distribution",
    label: "Cấp phát & thu hồi",
    description: "Xuất cá nhân, phòng ban, cược đồ và thu hồi BHLĐ",
  },
];

export const REPORT_LOAI_OPTIONS = [
  "ALL",
  "NHAP",
  "XUAT_CN",
  "XUAT_PB",
  "XUAT_CUOC_NV",
  "XUAT_CUOC_CN",
  "XUAT_CUOC_PB",
  "THU_HOI_BHLD",
] as const;

export type ReportLoaiFilter = (typeof REPORT_LOAI_OPTIONS)[number];

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  /** Mã bộ phận hoặc ALL */
  dept: string;
  nhom: string;
  loai: ReportLoaiFilter;
}

export interface ReportDeptRow {
  maBoPhan: string;
  tenBoPhan: string;
  label: string;
  qtyIn: number;
  qtyOut: number;
  lineCount: number;
}

/** Danh mục ban bộ đầy đủ — ưu tiên DB, bổ sung từ catalog cố định. */
export function buildReportDeptCatalog(boPhan: BoPhanRow[]): BoPhanRow[] {
  const map = new Map<string, BoPhanRow>();
  for (const bp of boPhan) {
    if (bp.maBoPhan) map.set(bp.maBoPhan, bp);
  }
  for (const [ma, ten] of Object.entries(BO_PHAN_TEN)) {
    if (!map.has(ma)) {
      map.set(ma, { id: 0, maBoPhan: ma, tenBoPhan: ten });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => boPhanSortKey(a.maBoPhan) - boPhanSortKey(b.maBoPhan),
  );
}

export function deptFilterOptions(boPhan: BoPhanRow[]): { value: string; label: string }[] {
  const catalog = buildReportDeptCatalog(boPhan);
  return [
    { value: "ALL", label: "Tất cả ban bộ" },
    ...catalog.map((bp) => ({
      value: bp.maBoPhan ?? "",
      label: formatBoPhanLabel(bp),
    })),
  ];
}

function lineMatchesDept(line: ReportLineRow, maBoPhan: string): boolean {
  if (line.maBoPhan === maBoPhan) return true;
  const ten = line.tenBoPhan ?? "";
  const catalogTen = BO_PHAN_TEN[maBoPhan];
  return catalogTen != null && ten === catalogTen;
}

export interface ReportMeta {
  title: string;
  periodLabel: string;
  preparedBy: string;
  generatedAt: string;
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function fmtMoney(n: number) {
  return `${fmtNum(Math.round(n))} ₫`;
}

export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthStartInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function parseReportDate(ngayLap: string): Date | null {
  const part = ngayLap.split(",")[0]?.trim();
  if (!part) return null;
  const m = part.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

export function formatInputDateVi(iso: string): string {
  const [y, mo, d] = iso.split("-");
  if (!y || !mo || !d) return iso;
  return `${d}/${mo}/${y}`;
}

export function buildPeriodLabel(from: string, to: string): string {
  return `${formatInputDateVi(from)} – ${formatInputDateVi(to)}`;
}

function inDateRange(ngayLap: string, from: string, to: string): boolean {
  const d = parseReportDate(ngayLap);
  if (!d) return true;
  const start = new Date(from);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}

export function filterReportLines(lines: ReportLineRow[], filters: ReportFilters): ReportLineRow[] {
  return lines.filter((l) => {
    if (!inDateRange(l.ngayLap, filters.dateFrom, filters.dateTo)) return false;
    if (filters.dept !== "ALL" && !lineMatchesDept(l, filters.dept)) return false;
    if (filters.nhom !== "ALL" && l.nhomHang !== filters.nhom) return false;
    if (filters.loai !== "ALL" && l.loaiPhieu !== filters.loai) return false;
    return true;
  });
}

export function filterDistributionLines(lines: ReportLineRow[]): ReportLineRow[] {
  return lines.filter((l) => l.loaiPhieu !== "NHAP");
}

export interface ItemAggRow {
  maHang: string;
  name: string;
  unit: string;
  nhom: string | null;
  qtyIn: number;
  qtyOut: number;
}

export function aggregateByItem(lines: ReportLineRow[]): ItemAggRow[] {
  const map = new Map<string, ItemAggRow>();
  for (const l of lines) {
    const cur = map.get(l.maHang) ?? {
      maHang: l.maHang,
      name: l.tenSanPham,
      unit: l.donViTinh,
      nhom: l.nhomHang,
      qtyIn: 0,
      qtyOut: 0,
    };
    if (l.loaiPhieu === "NHAP") cur.qtyIn += l.soLuong;
    else cur.qtyOut += l.soLuong;
    map.set(l.maHang, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.qtyOut + b.qtyIn - (a.qtyOut + a.qtyIn));
}

export function aggregateByDept(lines: ReportLineRow[], boPhan: BoPhanRow[]): ReportDeptRow[] {
  const catalog = buildReportDeptCatalog(boPhan);
  const stats = new Map<string, { qtyIn: number; qtyOut: number; lineCount: number }>();
  for (const bp of catalog) {
    if (bp.maBoPhan) stats.set(bp.maBoPhan, { qtyIn: 0, qtyOut: 0, lineCount: 0 });
  }

  for (const l of lines) {
    const ma = l.maBoPhan ?? findMaBoPhanByTen(l.tenBoPhan);
    if (!ma || !stats.has(ma)) continue;
    const cur = stats.get(ma)!;
    cur.lineCount += 1;
    if (l.loaiPhieu === "NHAP") cur.qtyIn += l.soLuong;
    else cur.qtyOut += l.soLuong;
  }

  return catalog
    .filter((bp) => bp.maBoPhan)
    .map((bp) => {
      const s = stats.get(bp.maBoPhan!) ?? { qtyIn: 0, qtyOut: 0, lineCount: 0 };
      return {
        maBoPhan: bp.maBoPhan!,
        tenBoPhan: bp.tenBoPhan,
        label: formatBoPhanLabel(bp),
        qtyIn: s.qtyIn,
        qtyOut: s.qtyOut,
        lineCount: s.lineCount,
      };
    });
}

function findMaBoPhanByTen(tenBoPhan: string | null): string | null {
  if (!tenBoPhan) return null;
  for (const [ma, ten] of Object.entries(BO_PHAN_TEN)) {
    if (ten === tenBoPhan) return ma;
  }
  return null;
}

export function countVouchers(lines: ReportLineRow[], vouchers: VoucherSummary[]): number {
  const ids = new Set(lines.map((l) => l.soPhieu));
  return vouchers.filter((v) => ids.has(v.soPhieu)).length;
}

export interface ExecutiveSummary {
  totalIn: number;
  totalOut: number;
  voucherCount: number;
  lineCount: number;
  deptCount: number;
  topItems: ItemAggRow[];
  byDept: ReportDeptRow[];
  lowStockCount: number;
  quotaAlertCount: number;
}

export function buildExecutiveSummary(
  lines: ReportLineRow[],
  vouchers: VoucherSummary[],
  vatTu: VatTuRow[],
  quotaAlerts: TienDoDinhMucRow[],
  boPhan: BoPhanRow[],
): ExecutiveSummary {
  const totalIn = lines.filter((l) => l.loaiPhieu === "NHAP").reduce((s, l) => s + l.soLuong, 0);
  const totalOut = lines.filter((l) => l.loaiPhieu !== "NHAP").reduce((s, l) => s + l.soLuong, 0);
  const byDept = aggregateByDept(lines, boPhan);
  const activeDepts = byDept.filter((d) => d.qtyIn > 0 || d.qtyOut > 0).length;
  return {
    totalIn,
    totalOut,
    voucherCount: countVouchers(lines, vouchers),
    lineCount: lines.length,
    deptCount: activeDepts,
    topItems: aggregateByItem(lines).slice(0, 8),
    byDept,
    lowStockCount: vatTu.filter((v) => v.soLuongTon <= v.minStock).length,
    quotaAlertCount: new Set(quotaAlerts.map((q) => q.maNV)).size,
  };
}

export function inventoryRows(vatTu: VatTuRow[], nhom: string): VatTuRow[] {
  let rows = [...vatTu];
  if (nhom !== "ALL") rows = rows.filter((v) => v.nhomHang === nhom);
  return rows.sort((a, b) => {
    const aLow = a.soLuongTon <= a.minStock ? 0 : 1;
    const bLow = b.soLuongTon <= b.minStock ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return a.maHang.localeCompare(b.maHang);
  });
}

export function slugifyFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
