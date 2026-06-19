import * as XLSX from "xlsx-js-style";

export { XLSX };

type Cell = string | number | null | undefined;
type BorderEdge = { style: string; color: { rgb: string } };
type CellStyle = {
  font?: { bold?: boolean; sz?: number; name?: string; italic?: boolean };
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean };
  fill?: { fgColor?: { rgb: string }; patternType?: string };
  border?: {
    top?: BorderEdge;
    bottom?: BorderEdge;
    left?: BorderEdge;
    right?: BorderEdge;
  };
  numFmt?: string;
};

const FONT = "Arial";
const HEADER_FILL = "D9EAF7";
const BORDER_THIN: BorderEdge = { style: "thin", color: { rgb: "000000" } };
const BORDER_ALL = {
  top: BORDER_THIN,
  bottom: BORDER_THIN,
  left: BORDER_THIN,
  right: BORDER_THIN,
};

function cellRef(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

function expandRange(ws: XLSX.WorkSheet, r: number, c: number) {
  const range = ws["!ref"]
    ? XLSX.utils.decode_range(ws["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  if (r > range.e.r) range.e.r = r;
  if (c > range.e.c) range.e.c = c;
  if (r < range.s.r) range.s.r = r;
  if (c < range.s.c) range.s.c = c;
  ws["!ref"] = XLSX.utils.encode_range(range);
}

function headerCellStyle(): CellStyle {
  return {
    font: { name: FONT, sz: 10, bold: true },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    fill: { fgColor: { rgb: HEADER_FILL }, patternType: "solid" },
    border: BORDER_ALL,
  };
}

function dataCellStyle(align: "left" | "center" | "right" = "left"): CellStyle {
  return {
    font: { name: FONT, sz: 10 },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
    border: BORDER_ALL,
  };
}

function moneyCellStyle(): CellStyle {
  return {
    ...dataCellStyle("right"),
    numFmt: "#,##0 \"đ\"",
  };
}

function numberCellStyle(): CellStyle {
  return {
    ...dataCellStyle("right"),
    numFmt: "#,##0",
  };
}

export interface ReportBanner {
  createdAt?: string;
  title: string;
  periodLabel?: string;
  filters?: string[];
  note?: string;
}

export function createEmptySheet(): XLSX.WorkSheet {
  return {};
}

export function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

export function setCell(ws: XLSX.WorkSheet, r: number, c: number, value: Cell, style?: CellStyle) {
  const ref = cellRef(r, c);
  const isNumber = typeof value === "number" && !Number.isNaN(value);
  const cell: XLSX.CellObject = {
    v: value === null || value === undefined ? "" : value,
    t: isNumber ? "n" : "s",
  };
  if (style) cell.s = style;
  ws[ref] = cell;
  expandRange(ws, r, c);
}

function mergeRow(ws: XLSX.WorkSheet, r: number, c0: number, c1: number, value: Cell, style: CellStyle) {
  setCell(ws, r, c0, value, style);
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r, c: c0 }, e: { r, c: c1 } });
}

export function writeReportBanner(ws: XLSX.WorkSheet, banner: ReportBanner, colCount: number, startRow = 0): number {
  let r = startRow;
  if (banner.createdAt) {
    setCell(ws, r, 0, `Ngày lập: ${banner.createdAt}`, {
      font: { name: FONT, sz: 10 },
      alignment: { horizontal: "left", vertical: "center" },
    });
    r += 1;
  }
  r += 1;
  mergeRow(ws, r, 0, colCount - 1, banner.title, {
    font: { name: FONT, sz: 16, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
  });
  r += 1;
  if (banner.periodLabel) {
    mergeRow(ws, r, 0, colCount - 1, banner.periodLabel, {
      font: { name: FONT, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
    });
    r += 1;
  }
  for (const f of banner.filters ?? []) {
    mergeRow(ws, r, 0, colCount - 1, f, {
      font: { name: FONT, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
    });
    r += 1;
  }
  r += 1;
  if (banner.note) {
    mergeRow(ws, r, 0, colCount - 1, banner.note, {
      font: { name: FONT, sz: 10, italic: true },
      alignment: { horizontal: "right", vertical: "center" },
    });
    r += 1;
  }
  return r;
}

export function borderRange(ws: XLSX.WorkSheet, r0: number, r1: number, c0: number, c1: number) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ref = cellRef(r, c);
      const cell = ws[ref];
      if (!cell) {
        setCell(ws, r, c, "", { border: BORDER_ALL });
      } else {
        cell.s = { ...(cell.s ?? {}), border: BORDER_ALL };
      }
    }
  }
}

export function writeTableSection(
  ws: XLSX.WorkSheet,
  startRow: number,
  headers: string[],
  rows: Cell[][],
  options?: {
    footer?: Cell[];
    moneyCols?: number[];
    numberCols?: number[];
    centerCols?: number[];
  },
): number {
  const colCount = headers.length;
  for (let c = 0; c < colCount; c++) {
    setCell(ws, startRow, c, headers[c], headerCellStyle());
  }

  let r = startRow + 1;
  for (const row of rows) {
    for (let c = 0; c < colCount; c++) {
      const val = row[c];
      let style: CellStyle = dataCellStyle();
      if (options?.centerCols?.includes(c)) style = dataCellStyle("center");
      if (options?.moneyCols?.includes(c) && typeof val === "number") style = moneyCellStyle();
      else if (options?.numberCols?.includes(c) && typeof val === "number") style = numberCellStyle();
      setCell(ws, r, c, val ?? "", style);
    }
    r += 1;
  }

  if (options?.footer) {
    for (let c = 0; c < colCount; c++) {
      const val = options.footer[c];
      let style: CellStyle = {
        ...dataCellStyle(),
        font: { name: FONT, sz: 10, bold: true },
      };
      if (options?.moneyCols?.includes(c) && typeof val === "number") style = { ...moneyCellStyle(), font: { name: FONT, sz: 10, bold: true } };
      else if (options?.numberCols?.includes(c) && typeof val === "number") style = { ...numberCellStyle(), font: { name: FONT, sz: 10, bold: true } };
      setCell(ws, r, c, val ?? "", style);
    }
    r += 1;
  }

  borderRange(ws, startRow, r - 1, 0, colCount - 1);
  return r;
}

export function writeLabelValueGrid(
  ws: XLSX.WorkSheet,
  startRow: number,
  rows: Array<[string, Cell]>,
  options?: { headerLabels?: [string, string] },
): number {
  let r = startRow;
  if (options?.headerLabels) {
    setCell(ws, r, 0, options.headerLabels[0], headerCellStyle());
    setCell(ws, r, 1, options.headerLabels[1], headerCellStyle());
    r += 1;
  }
  for (const [label, value] of rows) {
    setCell(ws, r, 0, label, { ...dataCellStyle(), font: { name: FONT, sz: 10, bold: true } });
    const isMoney = typeof value === "number";
    setCell(ws, r, 1, value ?? "", isMoney ? moneyCellStyle() : dataCellStyle());
    r += 1;
  }
  borderRange(ws, startRow, r - 1, 0, 1);
  return r;
}

export function buildStyledTableSheet(options: {
  banner: ReportBanner;
  headers: string[];
  rows: Cell[][];
  footer?: Cell[];
  colWidths?: number[];
  moneyCols?: number[];
  numberCols?: number[];
  centerCols?: number[];
}): XLSX.WorkSheet {
  const ws = createEmptySheet();
  const colCount = options.headers.length;
  const tableStart = writeReportBanner(ws, options.banner, colCount);
  writeTableSection(ws, tableStart, options.headers, options.rows, {
    footer: options.footer,
    moneyCols: options.moneyCols,
    numberCols: options.numberCols,
    centerCols: options.centerCols,
  });
  if (options.colWidths?.length) setColWidths(ws, options.colWidths);
  return ws;
}

export function buildStyledInfoSheet(options: {
  banner: ReportBanner;
  rows: Array<[string, Cell]>;
  headerLabels?: [string, string];
  colWidths?: [number, number];
  extraRows?: Array<[string, Cell]>;
}): XLSX.WorkSheet {
  const ws = createEmptySheet();
  const colCount = 2;
  let r = writeReportBanner(ws, options.banner, colCount);
  r = writeLabelValueGrid(ws, r, options.rows, { headerLabels: options.headerLabels });
  if (options.extraRows?.length) {
    r += 1;
    writeLabelValueGrid(ws, r, options.extraRows);
  }
  if (options.colWidths) setColWidths(ws, options.colWidths);
  return ws;
}

export function appendSheet(wb: XLSX.WorkBook, name: string, ws: XLSX.WorkSheet) {
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

export function writeWorkbookFile(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { bookType: "xlsx", compression: true });
}

export function newWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}
