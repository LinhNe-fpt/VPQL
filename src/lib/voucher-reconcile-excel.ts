import { slugifyFilename } from "./report-workspace";
import type { VoucherDetail, VoucherLine, VoucherSummary } from "./types/vpp";
import { VOUCHER_LABEL } from "./types/vpp";
import { formatBhldTrangThai } from "./bhld";
import {
  appendSheet,
  buildStyledInfoSheet,
  buildStyledTableSheet,
  newWorkbook,
  writeWorkbookFile,
} from "./excel-export-style";

type Cell = string | number | null | undefined;

function buildLineTable(
  lines: VoucherLine[],
  stockByMaHang: Record<string, number>,
  options: { showBhldDates: boolean; showBhldStatus: boolean; hidePriceCol: boolean },
) {
  const headers: string[] = ["STT", "Mã hàng", "Tên vật phẩm"];
  if (options.showBhldDates) {
    headers.push("Bắt đầu SD", "Ngày thu hồi", "Tháng SD");
  }
  if (options.showBhldStatus) headers.push("Trạng thái hàng");
  headers.push("ĐVT", "SL phiếu");
  if (!options.hidePriceCol) {
    headers.push("Đơn giá", "Thành tiền");
  }
  headers.push("Tồn kho hiện tại", "Ghi chú đối chiếu");

  const rows: Cell[][] = lines.map((line, idx) => {
    const row: Cell[] = [idx + 1, line.maHang, line.tenSanPham];
    if (options.showBhldDates) {
      row.push(line.ngayCap ?? "", line.ngayThuHoi ?? "", line.soThangSuDung ?? "");
    }
    if (options.showBhldStatus) {
      row.push(line.trangThaiHang ? formatBhldTrangThai(line.trangThaiHang) ?? line.trangThaiHang : "");
    }
    row.push(line.donViTinh, line.soLuong);
    if (!options.hidePriceCol) {
      row.push(line.donGia, line.thanhTien);
    }
    row.push(stockByMaHang[line.maHang] ?? "", "");
    return row;
  });

  const totalQty = lines.reduce((s, l) => s + l.soLuong, 0);
  const totalMoney = lines.reduce((s, l) => s + l.thanhTien, 0);
  const footer: Cell[] = ["", "", "Tổng cộng"];
  if (options.showBhldDates) footer.push("", "", "");
  if (options.showBhldStatus) footer.push("");
  footer.push("", totalQty);
  if (!options.hidePriceCol) footer.push("", totalMoney);
  footer.push("", "");

  const moneyCols = headers
    .map((h, i) =>
      /đơn giá|thành tiền|giá trị/i.test(h) ? i : -1,
    )
    .filter((i) => i >= 0);
  const numberCols = headers
    .map((h, i) =>
      /stt|sl|số lượng|tồn|tháng sd/i.test(h) ? i : -1,
    )
    .filter((i) => i >= 0);

  return { headers, rows, footer, moneyCols, numberCols, centerCols: [0] };
}

export function exportVoucherReconciliationExcel(params: {
  summary: VoucherSummary;
  lines: VoucherLine[];
  stockByMaHang?: Record<string, number>;
  preparedBy?: string;
}) {
  const { summary, lines, stockByMaHang = {}, preparedBy = "—" } = params;
  const generatedAt = new Date().toLocaleString("vi-VN", { hour12: false });

  const isBhld = summary.loaiPhieu === "THU_HOI_BHLD";
  const showBhldDates = isBhld && lines.some((l) => l.ngayCap || l.soThangSuDung);
  const showBhldStatus = isBhld || lines.some((l) => l.trangThaiHang);
  const hidePriceCol = isBhld || showBhldDates;

  const wb = newWorkbook();

  appendSheet(
    wb,
    "Thông tin phiếu",
    buildStyledInfoSheet({
      banner: {
        createdAt: generatedAt,
        title: "Phiếu đối chiếu nhanh",
        periodLabel: `Số phiếu: ${summary.soPhieu}`,
        filters: [
          `Loại phiếu: ${VOUCHER_LABEL[summary.loaiPhieu]}`,
          `Ngày lập: ${summary.ngayLap}`,
        ],
      },
      headerLabels: ["Thông tin", "Giá trị"],
      rows: [
        ["Người lập", summary.nguoiLap ?? "—"],
        ["Người nhận / nguồn", summary.recipient],
        ["Mã NV", summary.maNV ?? ""],
        ["Ban bộ", summary.tenBoPhan ?? summary.department],
        ["Ghi chú phiếu", summary.ghiChu ?? ""],
      ],
      extraRows: [
        ["Người xuất đối chiếu", preparedBy],
        ["Thời điểm xuất", generatedAt],
      ],
      colWidths: [22, 48],
    }),
  );

  const lineTable = buildLineTable(lines, stockByMaHang, { showBhldDates, showBhldStatus, hidePriceCol });
  appendSheet(
    wb,
    "Chi tiết đối chiếu",
    buildStyledTableSheet({
      banner: {
        createdAt: generatedAt,
        title: "Chi tiết đối chiếu phiếu",
        periodLabel: `Số phiếu: ${summary.soPhieu} · ${VOUCHER_LABEL[summary.loaiPhieu]}`,
        note: "(File dùng đối chiếu phiếu giấy với hệ thống · cột «Ghi chú đối chiếu» để ghi chú thủ công)",
      },
      headers: lineTable.headers,
      rows: lineTable.rows,
      footer: lineTable.footer,
      colWidths: lineTable.headers.map(() => 14),
      moneyCols: lineTable.moneyCols,
      numberCols: lineTable.numberCols,
      centerCols: lineTable.centerCols,
    }),
  );

  const slug = slugifyFilename(summary.soPhieu) || "phieu";
  writeWorkbookFile(wb, `doi-chieu-${slug}.xlsx`);
}

/** Dùng khi đã có VoucherDetail đầy đủ từ API. */
export function exportVoucherDetailReconciliationExcel(
  detail: VoucherDetail,
  stockByMaHang?: Record<string, number>,
  preparedBy?: string,
) {
  exportVoucherReconciliationExcel({
    summary: detail,
    lines: detail.lines,
    stockByMaHang,
    preparedBy,
  });
}
