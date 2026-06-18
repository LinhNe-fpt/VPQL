import * as XLSX from "xlsx";

import type { ReportLineRow } from "./vpp-queries.server";
import {
  aggregateByDept,
  aggregateByItem,
  buildExecutiveSummary,
  inventoryRows,
  slugifyFilename,
  type ReportMeta,
  type ReportTemplateId,
} from "./report-workspace";
import type { BoPhanRow, TienDoDinhMucRow, VatTuRow, VoucherSummary, VoucherType } from "./types/vpp";
import { VOUCHER_LABEL } from "./types/vpp";

type Cell = string | number | null | undefined;
type AoA = Cell[][];

function metaSheet(meta: ReportMeta): AoA {
  return [
    ["STOCKFLOW — BÁO CÁO QUẢN TRỊ KHO"],
    [],
    ["Tiêu đề", meta.title],
    ["Kỳ báo cáo", meta.periodLabel],
    ["Người lập", meta.preparedBy],
    ["Thời điểm xuất", meta.generatedAt],
  ];
}

function overviewSheet(
  lines: ReportLineRow[],
  vouchers: VoucherSummary[],
  vatTu: VatTuRow[],
  quotaAlerts: TienDoDinhMucRow[],
  boPhan: BoPhanRow[],
): AoA {
  const s = buildExecutiveSummary(lines, vouchers, vatTu, quotaAlerts, boPhan);
  return [
    ["CHỈ TIÊU TỔNG HỢP"],
    [],
    ["Chỉ tiêu", "Giá trị", "Ghi chú"],
    ["Tổng nhập (đơn vị)", s.totalIn, ""],
    ["Tổng xuất / thu hồi (đơn vị)", s.totalOut, ""],
    ["Số phiếu", s.voucherCount, `${s.lineCount} dòng chi tiết`],
    ["Ban bộ phát sinh", s.deptCount, `trên ${s.byDept.length} ban`],
    ["Mặt hàng sắp hết", s.lowStockCount, "tồn ≤ ngưỡng tối thiểu"],
    ["NV cảnh báo định mức", s.quotaAlertCount, "tiêu hao ≥ 75% tháng"],
  ];
}

function deptSheet(lines: ReportLineRow[], boPhan: BoPhanRow[]): AoA {
  return [
    ["Mã BP", "Ban bộ", "Nhập", "Xuất", "Số dòng"],
    ...aggregateByDept(lines, boPhan).map((d) => [
      d.maBoPhan,
      d.tenBoPhan,
      d.qtyIn,
      d.qtyOut,
      d.lineCount,
    ]),
  ];
}

function itemSheet(lines: ReportLineRow[]): AoA {
  return [
    ["Mã hàng", "Tên vật tư", "Nhóm hàng", "ĐVT", "Nhập", "Xuất"],
    ...aggregateByItem(lines).map((r) => [
      r.maHang,
      r.name,
      r.nhom ?? "",
      r.unit,
      r.qtyIn,
      r.qtyOut,
    ]),
  ];
}

function transactionSheet(lines: ReportLineRow[]): AoA {
  return [
    [
      "Mã phiếu",
      "Loại phiếu",
      "Ngày lập",
      "Mã BP",
      "Ban bộ",
      "Người nhận / nguồn",
      "Mã hàng",
      "Tên vật tư",
      "ĐVT",
      "Số lượng",
    ],
    ...lines.map((l) => [
      l.soPhieu,
      VOUCHER_LABEL[l.loaiPhieu as VoucherType] ?? l.loaiPhieu,
      l.ngayLap,
      l.maBoPhan ?? "",
      l.tenBoPhan ?? "",
      l.recipient,
      l.maHang,
      l.tenSanPham,
      l.donViTinh,
      l.soLuong,
    ]),
  ];
}

function inventorySheet(vatTu: VatTuRow[], nhom: string): AoA {
  return [
    ["Mã hàng", "Tên vật tư", "Nhóm", "ĐVT", "Tồn", "Tối thiểu", "Đơn giá (₫)", "Giá trị tồn (₫)", "Trạng thái"],
    ...inventoryRows(vatTu, nhom).map((v) => [
      v.maHang,
      v.tenSanPham,
      v.nhomHang ?? "",
      v.donViTinh,
      v.soLuongTon,
      v.minStock,
      v.donGia,
      v.soLuongTon * v.donGia,
      v.soLuongTon <= v.minStock ? "Sắp hết" : "Ổn định",
    ]),
  ];
}

const COL_WIDTHS: Record<string, number[]> = {
  meta: [28, 40],
  overview: [32, 18, 28],
  dept: [10, 28, 12, 12, 12],
  item: [14, 36, 18, 8, 12, 12],
  transactions: [14, 22, 18, 8, 22, 24, 14, 32, 8, 12],
  inventory: [14, 36, 18, 8, 10, 10, 14, 16, 12],
};

function appendSheet(wb: XLSX.WorkBook, name: string, data: AoA, colWidths?: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  if (colWidths?.length) {
    ws["!cols"] = colWidths.map((wch) => ({ wch }));
  }
  const safeName = name.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
}

export function exportReportExcel(params: {
  template: ReportTemplateId;
  meta: ReportMeta;
  lines: ReportLineRow[];
  vatTu: VatTuRow[];
  boPhan: BoPhanRow[];
  vouchers?: VoucherSummary[];
  quotaAlerts?: TienDoDinhMucRow[];
  nhomFilter?: string;
}) {
  const {
    template,
    meta,
    lines,
    vatTu,
    boPhan,
    vouchers = [],
    quotaAlerts = [],
    nhomFilter = "ALL",
  } = params;

  const wb = XLSX.utils.book_new();
  appendSheet(wb, "Thông tin", metaSheet(meta), COL_WIDTHS.meta);

  switch (template) {
    case "executive":
      appendSheet(wb, "Tổng quan", overviewSheet(lines, vouchers, vatTu, quotaAlerts, boPhan), COL_WIDTHS.overview);
      appendSheet(wb, "Ban bộ", deptSheet(lines, boPhan), COL_WIDTHS.dept);
      appendSheet(wb, "Mã hàng", itemSheet(lines), COL_WIDTHS.item);
      appendSheet(wb, "Chi tiết", transactionSheet(lines), COL_WIDTHS.transactions);
      break;
    case "distribution":
      appendSheet(wb, "Ban bộ", deptSheet(lines, boPhan), COL_WIDTHS.dept);
      appendSheet(wb, "Mã hàng", itemSheet(lines), COL_WIDTHS.item);
      appendSheet(wb, "Chi tiết", transactionSheet(lines), COL_WIDTHS.transactions);
      break;
    case "inventory":
      appendSheet(wb, "Tồn kho", inventorySheet(vatTu, nhomFilter), COL_WIDTHS.inventory);
      break;
    case "transactions":
      appendSheet(wb, "Giao dịch", transactionSheet(lines), COL_WIDTHS.transactions);
      break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = slugifyFilename(meta.title) || template;
  XLSX.writeFile(wb, `bao-cao-${slug}-${stamp}.xlsx`, { bookType: "xlsx", compression: true });
}
