import {
  appendSheet,
  buildStyledInfoSheet,
  buildStyledTableSheet,
  newWorkbook,
  writeWorkbookFile,
} from "./excel-export-style";

import type { BienDongRow, VatTuRow, VoucherSummary } from "./types/vpp";
import { VOUCHER_LABEL } from "./types/vpp";

export interface KiemKeFilters {
  dateFrom: string;
  dateTo: string;
  nhom: string;
  q: string;
}

export interface KiemKeSummary {
  totalInQty: number;
  totalOutQty: number;
  totalInValue: number;
  totalOutValue: number;
  movementCount: number;
  stockValue: number;
  itemCount: number;
  varianceLineCount: number;
}

export function monthStartInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function todayInput(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

export function filterBienDong(rows: BienDongRow[], filters: KiemKeFilters): BienDongRow[] {
  const q = filters.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (filters.dateFrom && r.ngayGio.slice(0, 10) < filters.dateFrom) return false;
    if (filters.dateTo && r.ngayGio.slice(0, 10) > filters.dateTo) return false;
    if (filters.nhom !== "ALL" && r.nhomHang !== filters.nhom) return false;
    if (q && !`${r.maHang} ${r.tenSanPham} ${r.soPhieu}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function summarizeBienDong(rows: BienDongRow[]): Pick<
  KiemKeSummary,
  "totalInQty" | "totalOutQty" | "totalInValue" | "totalOutValue" | "movementCount"
> {
  let totalInQty = 0;
  let totalOutQty = 0;
  let totalInValue = 0;
  let totalOutValue = 0;
  for (const r of rows) {
    if (r.loaiBienDong === "TANG") {
      totalInQty += r.soLuong;
      totalInValue += r.giaTri;
    } else {
      totalOutQty += r.soLuong;
      totalOutValue += r.giaTri;
    }
  }
  return { totalInQty, totalOutQty, totalInValue, totalOutValue, movementCount: rows.length };
}

export function summarizeStock(vatTu: VatTuRow[]): Pick<KiemKeSummary, "stockValue" | "itemCount"> {
  return {
    itemCount: vatTu.length,
    stockValue: vatTu.reduce((s, v) => s + v.soLuongTon * v.donGia, 0),
  };
}

export interface KiemKeCountRow {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  nhomHang: string | null;
  donGia: number;
  soLuongHeThong: number;
  soLuongThucTe: number;
  chenhLech: number;
  giaTriChenhLech: number;
  giaTriTon: number;
}

export function buildCountRows(
  vatTu: VatTuRow[],
  counts: Record<string, number>,
  onlyVariance = false,
): KiemKeCountRow[] {
  return vatTu
    .map((v) => {
      const soLuongThucTe = counts[v.maHang] ?? v.soLuongTon;
      const chenhLech = soLuongThucTe - v.soLuongTon;
      return {
        maHang: v.maHang,
        tenSanPham: v.tenSanPham,
        donViTinh: v.donViTinh,
        nhomHang: v.nhomHang,
        donGia: v.donGia,
        soLuongHeThong: v.soLuongTon,
        soLuongThucTe,
        chenhLech,
        giaTriChenhLech: chenhLech * v.donGia,
        giaTriTon: soLuongThucTe * v.donGia,
      };
    })
    .filter((r) => !onlyVariance || r.chenhLech !== 0);
}

export interface NhomAggRow {
  nhomHang: string;
  itemCount: number;
  tonQty: number;
  tonValue: number;
  nhapQty: number;
  xuatQty: number;
  nhapValue: number;
  xuatValue: number;
}

export function aggregateByNhom(vatTu: VatTuRow[], movements: BienDongRow[]): NhomAggRow[] {
  const map = new Map<string, NhomAggRow>();

  for (const v of vatTu) {
    const nhom = v.nhomHang ?? "Khác";
    const cur = map.get(nhom) ?? {
      nhomHang: nhom,
      itemCount: 0,
      tonQty: 0,
      tonValue: 0,
      nhapQty: 0,
      xuatQty: 0,
      nhapValue: 0,
      xuatValue: 0,
    };
    cur.itemCount += 1;
    cur.tonQty += v.soLuongTon;
    cur.tonValue += v.soLuongTon * v.donGia;
    map.set(nhom, cur);
  }

  for (const m of movements) {
    const nhom = m.nhomHang ?? "Khác";
    const cur = map.get(nhom) ?? {
      nhomHang: nhom,
      itemCount: 0,
      tonQty: 0,
      tonValue: 0,
      nhapQty: 0,
      xuatQty: 0,
      nhapValue: 0,
      xuatValue: 0,
    };
    if (m.loaiBienDong === "TANG") {
      cur.nhapQty += m.soLuong;
      cur.nhapValue += m.giaTri;
    } else {
      cur.xuatQty += m.soLuong;
      cur.xuatValue += m.giaTri;
    }
    map.set(nhom, cur);
  }

  return Array.from(map.values()).sort((a, b) => a.nhomHang.localeCompare(b.nhomHang, "vi"));
}

export function exportKiemKeExcel(opts: {
  title: string;
  periodLabel: string;
  preparedBy: string;
  countRows: KiemKeCountRow[];
  movements: BienDongRow[];
  vatTu: VatTuRow[];
  vouchers: VoucherSummary[];
}): void {
  const movSum = summarizeBienDong(opts.movements);
  const stockSum = summarizeStock(opts.vatTu);
  const byNhom = aggregateByNhom(opts.vatTu, opts.movements);
  const varianceRows = opts.countRows.filter((r) => r.chenhLech !== 0);
  const generatedAt = new Date().toLocaleString("vi-VN", { hour12: false });
  const banner = {
    createdAt: generatedAt,
    title: opts.title,
    periodLabel: opts.periodLabel,
    filters: [`Người lập: ${opts.preparedBy}`],
  };

  const wb = newWorkbook();

  appendSheet(
    wb,
    "Tổng quan",
    buildStyledInfoSheet({
      banner: { ...banner, title: "STOCKFLOW — BÁO CÁO KIỂM KÊ KHO" },
      headerLabels: ["Chỉ tiêu", "Giá trị"],
      rows: [
        ["Tiêu đề", opts.title],
        ["Kỳ báo cáo", opts.periodLabel],
        ["Người lập", opts.preparedBy],
        ["Thời điểm xuất", generatedAt],
      ],
      extraRows: [
        ["Tổng mã hàng", stockSum.itemCount],
        ["Giá trị tồn kho", Math.round(stockSum.stockValue)],
        ["Số biến động trong kỳ", movSum.movementCount],
        ["Tổng nhập (SL)", movSum.totalInQty],
        ["Tổng xuất (SL)", movSum.totalOutQty],
        ["Giá trị nhập", Math.round(movSum.totalInValue)],
        ["Giá trị xuất", Math.round(movSum.totalOutValue)],
      ],
      colWidths: [28, 24],
    }),
  );

  appendSheet(
    wb,
    "Tồn kho",
    buildStyledTableSheet({
      banner: { ...banner, title: "Tồn kho hiện tại" },
      headers: ["Mã hàng", "Tên vật tư", "Nhóm", "ĐVT", "Đơn giá", "Tồn HT", "Giá trị tồn"],
      rows: opts.vatTu.map((v) => [
        v.maHang,
        v.tenSanPham,
        v.nhomHang ?? "",
        v.donViTinh,
        v.donGia,
        v.soLuongTon,
        v.soLuongTon * v.donGia,
      ]),
      colWidths: [14, 36, 18, 8, 14, 10, 16],
      moneyCols: [4, 6],
      numberCols: [5],
    }),
  );

  appendSheet(
    wb,
    "Biến động chi tiết",
    buildStyledTableSheet({
      banner: { ...banner, title: "Biến động chi tiết trong kỳ" },
      headers: [
        "Ngày giờ",
        "Số phiếu",
        "Loại phiếu",
        "Mã hàng",
        "Tên vật tư",
        "Nhóm",
        "Biến động",
        "Số lượng",
        "Tồn sau",
        "Đơn giá",
        "Giá trị",
        "Người lập",
        "Ghi chú dòng",
      ],
      rows: opts.movements.map((r) => [
        r.ngayGio,
        r.soPhieu,
        VOUCHER_LABEL[r.loaiPhieu as keyof typeof VOUCHER_LABEL] ?? r.loaiPhieu,
        r.maHang,
        r.tenSanPham,
        r.nhomHang ?? "",
        r.loaiBienDong === "TANG" ? "Nhập" : "Xuất",
        r.soLuong,
        r.tonKhoSau,
        r.donGia,
        r.giaTri,
        r.nguoiLap ?? "",
        r.ghiChuDong ?? "",
      ]),
      colWidths: [18, 14, 22, 14, 32, 16, 10, 10, 10, 14, 14, 16, 24],
      numberCols: [7, 8],
      moneyCols: [9, 10],
    }),
  );

  appendSheet(
    wb,
    "Chênh lệch KK",
    buildStyledTableSheet({
      banner: { ...banner, title: "Chênh lệch kiểm kê" },
      headers: [
        "Mã hàng",
        "Tên vật tư",
        "Nhóm",
        "ĐVT",
        "Đơn giá",
        "Tồn HT",
        "Thực tế",
        "Chênh lệch",
        "Giá trị CL",
      ],
      rows: varianceRows.map((r) => [
        r.maHang,
        r.tenSanPham,
        r.nhomHang ?? "",
        r.donViTinh,
        r.donGia,
        r.soLuongHeThong,
        r.soLuongThucTe,
        r.chenhLech,
        r.giaTriChenhLech,
      ]),
      colWidths: [14, 36, 18, 8, 14, 10, 10, 12, 14],
      moneyCols: [4, 8],
      numberCols: [5, 6, 7],
    }),
  );

  appendSheet(
    wb,
    "Theo nhóm hàng",
    buildStyledTableSheet({
      banner: { ...banner, title: "Tổng hợp theo nhóm hàng" },
      headers: [
        "Nhóm hàng",
        "Số mã",
        "Tồn (SL)",
        "Giá trị tồn",
        "Nhập kỳ (SL)",
        "Xuất kỳ (SL)",
        "GT nhập",
        "GT xuất",
      ],
      rows: byNhom.map((r) => [
        r.nhomHang,
        r.itemCount,
        r.tonQty,
        Math.round(r.tonValue),
        r.nhapQty,
        r.xuatQty,
        Math.round(r.nhapValue),
        Math.round(r.xuatValue),
      ]),
      colWidths: [22, 10, 12, 16, 14, 14, 14, 14],
      numberCols: [1, 2, 4, 5],
      moneyCols: [3, 6, 7],
    }),
  );

  appendSheet(
    wb,
    "Phiếu kiểm kê",
    buildStyledTableSheet({
      banner: { ...banner, title: "Danh sách phiếu kiểm kê" },
      headers: ["Số phiếu", "Ngày lập", "Người lập", "Số dòng", "Tổng SL điều chỉnh", "Ghi chú"],
      rows: opts.vouchers.map((v) => [
        v.soPhieu,
        v.ngayLap,
        v.nguoiLap ?? "",
        v.lineCount,
        v.totalQty,
        v.ghiChu ?? "",
      ]),
      colWidths: [14, 18, 20, 10, 18, 32],
      numberCols: [3, 4],
    }),
  );

  const slug = opts.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  writeWorkbookFile(wb, `kiem-ke-${slug || "bao-cao"}-${opts.periodLabel.replace(/\//g, "-")}.xlsx`);
}
