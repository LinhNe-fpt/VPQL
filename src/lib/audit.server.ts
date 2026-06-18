import { randomUUID } from "node:crypto";

import { getDbPool, sql } from "./db.server";
import type { AuditAction, AuditLogEntry, AuditLogGroup } from "./types/vpp";

export type AuditFieldChange = {
  field: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
};

function formatValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** So sánh hai object theo danh sách trường — chỉ trả về trường thực sự đổi. */
export function diffAuditFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: { key: string; label: string }[],
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  for (const { key, label } of fields) {
    const oldValue = formatValue(before[key]);
    const newValue = formatValue(after[key]);
    if (oldValue === newValue) continue;
    changes.push({ field: key, fieldLabel: label, oldValue, newValue });
  }
  return changes;
}

/** Tạo danh sách thay đổi cho bản ghi mới. */
export function createAuditFields(
  values: Record<string, unknown>,
  fields: { key: string; label: string }[],
): AuditFieldChange[] {
  return fields
    .map(({ key, label }) => ({
      field: key,
      fieldLabel: label,
      oldValue: null,
      newValue: formatValue(values[key]),
    }))
    .filter((c) => c.newValue != null);
}

/** Tạo danh sách thay đổi khi xóa bản ghi. */
export function deleteAuditFields(
  values: Record<string, unknown>,
  fields: { key: string; label: string }[],
): AuditFieldChange[] {
  return fields
    .map(({ key, label }) => ({
      field: key,
      fieldLabel: label,
      oldValue: formatValue(values[key]),
      newValue: null,
    }))
    .filter((c) => c.oldValue != null);
}

export async function writeAuditLog(params: {
  bangDuLieu: string;
  maBanGhi: string;
  hanhDong: AuditAction;
  changes: AuditFieldChange[];
  nguoiThayDoi?: string | null;
}): Promise<void> {
  if (params.changes.length === 0) return;

  const pool = await getDbPool();
  const batchId = randomUUID();

  for (const change of params.changes) {
    await pool
      .request()
      .input("BatchId", sql.UniqueIdentifier, batchId)
      .input("BangDuLieu", sql.VarChar(100), params.bangDuLieu)
      .input("MaBanGhi", sql.NVarChar(255), params.maBanGhi)
      .input("HanhDong", sql.VarChar(20), params.hanhDong)
      .input("TruongThayDoi", sql.NVarChar(100), change.field)
      .input("TenTruong", sql.NVarChar(150), change.fieldLabel)
      .input("GiaTriCu", sql.NVarChar(sql.MAX), change.oldValue)
      .input("GiaTriMoi", sql.NVarChar(sql.MAX), change.newValue)
      .input("NguoiThayDoi", sql.NVarChar(100), params.nguoiThayDoi ?? null)
      .query(`
        INSERT INTO LichSuThayDoi (
          BatchId, BangDuLieu, MaBanGhi, HanhDong,
          TruongThayDoi, TenTruong, GiaTriCu, GiaTriMoi, NguoiThayDoi
        )
        VALUES (
          @BatchId, @BangDuLieu, @MaBanGhi, @HanhDong,
          @TruongThayDoi, @TenTruong, @GiaTriCu, @GiaTriMoi, @NguoiThayDoi
        )
      `);
  }
}

function formatDateTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleString("vi-VN", { hour12: false });
  }
  return String(value ?? "");
}

const BANG_LABEL: Record<string, string> = {
  DanhMucNhanVien: "Nhân sự",
  DinhMucCapPhat: "Định mức cấp phát",
  DanhMucVatTu: "Danh mục vật tư",
};

const HANH_LABEL: Record<AuditAction, string> = {
  CREATE: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
};

function mapEntry(row: Record<string, unknown>): AuditLogEntry {
  const hanhDong = String(row.HanhDong) as AuditAction;
  const bangDuLieu = String(row.BangDuLieu);
  return {
    id: Number(row.ID),
    batchId: String(row.BatchId),
    bangDuLieu,
    tenBang: BANG_LABEL[bangDuLieu] ?? bangDuLieu,
    maBanGhi: String(row.MaBanGhi),
    hanhDong,
    hanhDongLabel: HANH_LABEL[hanhDong] ?? hanhDong,
    truongThayDoi: String(row.TruongThayDoi),
    tenTruong: row.TenTruong != null ? String(row.TenTruong) : String(row.TruongThayDoi),
    giaTriCu: row.GiaTriCu != null ? String(row.GiaTriCu) : null,
    giaTriMoi: row.GiaTriMoi != null ? String(row.GiaTriMoi) : null,
    nguoiThayDoi: row.NguoiThayDoi != null ? String(row.NguoiThayDoi) : null,
    ngayGio: formatDateTime(row.NgayGio),
  };
}

export async function fetchAuditLogGroups(params?: {
  bangDuLieu?: string | null;
  maBanGhi?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<AuditLogGroup[]> {
  const pool = await getDbPool();
  const limit = Math.min(Math.max(params?.limit ?? 200, 1), 500);

  const result = await pool
    .request()
    .input("BangDuLieu", sql.VarChar(100), params?.bangDuLieu?.trim() || null)
    .input("MaBanGhi", sql.NVarChar(255), params?.maBanGhi?.trim() || null)
    .input("Q", sql.NVarChar(255), params?.q?.trim() ? `%${params.q.trim()}%` : null)
    .input("Limit", sql.Int, limit)
    .query(`
      SELECT TOP (@Limit)
        BatchId,
        BangDuLieu,
        MaBanGhi,
        HanhDong,
        NguoiThayDoi,
        MAX(NgayGio) AS NgayGio,
        COUNT(*) AS FieldCount
      FROM LichSuThayDoi
      WHERE (@BangDuLieu IS NULL OR BangDuLieu = @BangDuLieu)
        AND (@MaBanGhi IS NULL OR MaBanGhi = @MaBanGhi)
        AND (
          @Q IS NULL
          OR MaBanGhi LIKE @Q
          OR NguoiThayDoi LIKE @Q
          OR EXISTS (
            SELECT 1 FROM LichSuThayDoi x
            WHERE x.BatchId = LichSuThayDoi.BatchId
              AND (x.GiaTriCu LIKE @Q OR x.GiaTriMoi LIKE @Q OR x.TenTruong LIKE @Q)
          )
        )
      GROUP BY BatchId, BangDuLieu, MaBanGhi, HanhDong, NguoiThayDoi
      ORDER BY MAX(NgayGio) DESC, BatchId DESC
    `);

  const groups: AuditLogGroup[] = [];
  for (const row of result.recordset as Record<string, unknown>[]) {
    const bangDuLieu = String(row.BangDuLieu);
    const hanhDong = String(row.HanhDong) as AuditAction;
    const batchId = String(row.BatchId);

    const detail = await pool
      .request()
      .input("BatchId", sql.UniqueIdentifier, batchId)
      .query(`
        SELECT *
        FROM LichSuThayDoi
        WHERE BatchId = @BatchId
        ORDER BY ID
      `);

    groups.push({
      batchId,
      bangDuLieu,
      tenBang: BANG_LABEL[bangDuLieu] ?? bangDuLieu,
      maBanGhi: String(row.MaBanGhi),
      hanhDong,
      hanhDongLabel: HANH_LABEL[hanhDong] ?? hanhDong,
      nguoiThayDoi: row.NguoiThayDoi != null ? String(row.NguoiThayDoi) : null,
      ngayGio: formatDateTime(row.NgayGio),
      fieldCount: Number(row.FieldCount),
      changes: (detail.recordset as Record<string, unknown>[]).map(mapEntry),
    });
  }

  return groups;
}

export const NHAN_VIEN_AUDIT_FIELDS = [
  { key: "hoTen", label: "Họ tên" },
  { key: "chucDanh", label: "Chức danh" },
  { key: "tenBoPhan", label: "Bộ phận" },
  { key: "sizeAo", label: "Size áo" },
  { key: "sizeGiay", label: "Size giày" },
  { key: "trangThai", label: "Trạng thái" },
] as const;

export const DINH_MUC_AUDIT_FIELDS = [
  { key: "chucDanh", label: "Chức danh" },
  { key: "maHang", label: "Mã hàng" },
  { key: "tenSanPham", label: "Tên sản phẩm" },
  { key: "soLuongToiDa", label: "Số lượng tối đa" },
  { key: "ghiChu", label: "Ghi chú" },
] as const;

export const VAT_TU_AUDIT_FIELDS = [
  { key: "tenSanPham", label: "Tên sản phẩm" },
  { key: "donViTinh", label: "Đơn vị tính" },
  { key: "nhomHang", label: "Nhóm hàng" },
  { key: "donGia", label: "Đơn giá" },
  { key: "minStock", label: "Tồn tối thiểu" },
  { key: "hinhAnh", label: "Hình ảnh" },
] as const;
