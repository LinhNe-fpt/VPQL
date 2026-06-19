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
import {
  appendSheet,
  buildStyledInfoSheet,
  buildStyledTableSheet,
  newWorkbook,
  writeWorkbookFile,
  type ReportBanner,
} from "./excel-export-style";
import { reportBi, reportExcelCol, reportTemplateBi, REPORT_BI } from "./report-i18n";

type Cell = string | number | null | undefined;

function xlCol(key: keyof typeof REPORT_BI): string {
  return reportExcelCol(key);
}

const XL_TX_HEADERS = [
  xlCol("voucherNo"),
  xlCol("voucherType"),
  xlCol("issueDate"),
  xlCol("deptCode"),
  xlCol("colDept"),
  xlCol("recipientSource"),
  xlCol("colItemCode"),
  xlCol("colItemName"),
  xlCol("colUnit"),
  xlCol("colQtyLong"),
];

const XL_DEPT_HEADERS = [
  xlCol("deptCode"),
  xlCol("colDept"),
  xlCol("colIn"),
  xlCol("colOut"),
  xlCol("lineDetail"),
];

const XL_ITEM_HEADERS = [
  xlCol("colItemCode"),
  xlCol("colItemName"),
  xlCol("itemGroup"),
  xlCol("colUnit"),
  xlCol("colIn"),
  xlCol("colOut"),
];

function reportBanner(meta: ReportMeta, title?: string): ReportBanner {
  return {
    createdAt: meta.generatedAt,
    title: title ?? meta.title,
    periodLabel: meta.periodLabel,
    filters: [`${reportBi("preparedBy")}: ${meta.preparedBy}`],
  };
}

function overviewRows(
  lines: ReportLineRow[],
  vouchers: VoucherSummary[],
  vatTu: VatTuRow[],
  quotaAlerts: TienDoDinhMucRow[],
  boPhan: BoPhanRow[],
): Cell[][] {
  const s = buildExecutiveSummary(lines, vouchers, vatTu, quotaAlerts, boPhan);
  return [
    [xlCol("totalIn") + " (đơn vị)", s.totalIn, ""],
    [xlCol("totalOutReturn") + " (đơn vị)", s.totalOut, ""],
    [xlCol("voucherCount"), s.voucherCount, `${s.lineCount} dòng chi tiết`],
    [xlCol("deptActive"), s.deptCount, `trên ${s.byDept.length} ban`],
    [xlCol("lowStock"), s.lowStockCount, "tồn ≤ ngưỡng tối thiểu"],
    ["NV cảnh báo định mức (정량 경고)", s.quotaAlertCount, "tiêu hao ≥ 75% tháng"],
  ];
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

  const wb = newWorkbook();
  const banner = reportBanner(meta);

  appendSheet(
    wb,
    "Thông tin",
    buildStyledInfoSheet({
      banner: { ...banner, title: "STOCKFLOW — BÁO CÁO QUẢN TRỊ KHO / 창고 관리 보고서" },
      headerLabels: [xlCol("info"), xlCol("value")],
      rows: [
        ["Tiêu đề (제목)", meta.title],
        [xlCol("period"), meta.periodLabel],
        [xlCol("preparedBy"), meta.preparedBy],
        [xlCol("exportedAt"), meta.generatedAt],
      ],
      colWidths: [28, 40],
    }),
  );

  switch (template) {
    case "executive":
      appendSheet(
        wb,
        "Tổng quan",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("metric") + " — " + reportTemplateBi("executive", "label") },
          headers: [xlCol("metric"), xlCol("value"), xlCol("note")],
          rows: overviewRows(lines, vouchers, vatTu, quotaAlerts, boPhan),
          colWidths: [32, 18, 28],
          numberCols: [1],
        }),
      );
      appendSheet(
        wb,
        "Ban bộ",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("byDept") },
          headers: XL_DEPT_HEADERS,
          rows: aggregateByDept(lines, boPhan).map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            d.qtyIn,
            d.qtyOut,
            d.lineCount,
          ]),
          colWidths: [10, 28, 12, 12, 12],
          numberCols: [2, 3, 4],
        }),
      );
      appendSheet(
        wb,
        "Mã hàng",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("byItem") },
          headers: XL_ITEM_HEADERS,
          rows: aggregateByItem(lines).map((r) => [
            r.maHang,
            r.name,
            r.nhom ?? "",
            r.unit,
            r.qtyIn,
            r.qtyOut,
          ]),
          colWidths: [14, 36, 18, 8, 12, 12],
          numberCols: [4, 5],
        }),
      );
      appendSheet(
        wb,
        "Chi tiết",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("transactionDetail") },
          headers: XL_TX_HEADERS,
          rows: lines.map((l) => [
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
          colWidths: [14, 22, 18, 8, 22, 24, 14, 32, 8, 12],
          numberCols: [9],
        }),
      );
      break;
    case "distribution":
      appendSheet(
        wb,
        "Ban bộ",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("byDept") },
          headers: XL_DEPT_HEADERS,
          rows: aggregateByDept(lines, boPhan).map((d) => [
            d.maBoPhan,
            d.tenBoPhan,
            d.qtyIn,
            d.qtyOut,
            d.lineCount,
          ]),
          colWidths: [10, 28, 12, 12, 12],
          numberCols: [2, 3, 4],
        }),
      );
      appendSheet(
        wb,
        "Mã hàng",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("byItem") },
          headers: XL_ITEM_HEADERS,
          rows: aggregateByItem(lines).map((r) => [
            r.maHang,
            r.name,
            r.nhom ?? "",
            r.unit,
            r.qtyIn,
            r.qtyOut,
          ]),
          colWidths: [14, 36, 18, 8, 12, 12],
          numberCols: [4, 5],
        }),
      );
      appendSheet(
        wb,
        "Chi tiết",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("transactionDetail") },
          headers: XL_TX_HEADERS,
          rows: lines.map((l) => [
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
          colWidths: [14, 22, 18, 8, 22, 24, 14, 32, 8, 12],
          numberCols: [9],
        }),
      );
      break;
    case "inventory":
      appendSheet(
        wb,
        "Tồn kho",
        buildStyledTableSheet({
          banner: {
            ...banner,
            title: reportTemplateBi("inventory", "title"),
            filters: [
              ...banner.filters ?? [],
              nhomFilter !== "ALL"
                ? `${xlCol("itemGroup")}: ${nhomFilter}`
                : `${xlCol("itemGroup")}: Tất cả / 전체`,
            ],
          },
          headers: [
            xlCol("colItemCode"),
            xlCol("colItemName"),
            xlCol("colGroup"),
            xlCol("colUnit"),
            xlCol("colStock"),
            xlCol("colMin"),
            xlCol("colUnitPrice"),
            xlCol("stockValue"),
            xlCol("colStatus"),
          ],
          rows: inventoryRows(vatTu, nhomFilter).map((v) => [
            v.maHang,
            v.tenSanPham,
            v.nhomHang ?? "",
            v.donViTinh,
            v.soLuongTon,
            v.minStock,
            v.donGia,
            v.soLuongTon * v.donGia,
            v.soLuongTon <= v.minStock ? xlCol("almostOut") : xlCol("stable"),
          ]),
          colWidths: [14, 36, 18, 8, 10, 10, 14, 16, 12],
          numberCols: [4, 5],
          moneyCols: [6, 7],
        }),
      );
      break;
    case "transactions":
      appendSheet(
        wb,
        "Giao dịch",
        buildStyledTableSheet({
          banner: { ...banner, title: reportBi("transactionDetail") },
          headers: XL_TX_HEADERS,
          rows: lines.map((l) => [
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
          colWidths: [14, 22, 18, 8, 22, 24, 14, 32, 8, 12],
          numberCols: [9],
        }),
      );
      break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const slug = slugifyFilename(meta.title) || template;
  writeWorkbookFile(wb, `bao-cao-${slug}-${stamp}.xlsx`);
}
