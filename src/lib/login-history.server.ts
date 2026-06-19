import { getDbPool, sql } from "./db.server";
import type { LoginHistoryRow } from "./types/vpp";

export type LoginMethod = "PASSWORD" | "PIN";
export type LoginResult = "SUCCESS" | "FAILED";

function formatDateTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleString("vi-VN", { hour12: false });
  }
  return String(value ?? "");
}

function mapRow(row: Record<string, unknown>): LoginHistoryRow {
  const ketQua = String(row.KetQua) as LoginResult;
  const phuongThuc = String(row.PhuongThuc) as LoginMethod;
  return {
    id: Number(row.ID),
    maDangNhap: String(row.MaDangNhap),
    hoTen: row.HoTen != null ? String(row.HoTen) : null,
    phuongThuc,
    phuongThucLabel: phuongThuc === "PIN" ? "PIN" : "Mật khẩu",
    ketQua,
    ketQuaLabel: ketQua === "SUCCESS" ? "Thành công" : "Thất bại",
    diaChiIP: String(row.DiaChiIP),
    userAgent: row.UserAgent != null ? String(row.UserAgent) : null,
    ngayGio: formatDateTime(row.NgayGio),
  };
}

export async function insertLoginHistory(params: {
  maDangNhap: string;
  hoTen?: string | null;
  phuongThuc: LoginMethod;
  ketQua: LoginResult;
  diaChiIP: string;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const pool = await getDbPool();
    await pool
      .request()
      .input("MaDangNhap", sql.NVarChar(100), params.maDangNhap.slice(0, 100))
      .input("HoTen", sql.NVarChar(255), params.hoTen?.slice(0, 255) ?? null)
      .input("PhuongThuc", sql.VarChar(20), params.phuongThuc)
      .input("KetQua", sql.VarChar(20), params.ketQua)
      .input("DiaChiIP", sql.VarChar(45), params.diaChiIP.slice(0, 45))
      .input("UserAgent", sql.NVarChar(512), params.userAgent?.slice(0, 512) ?? null)
      .query(`
        INSERT INTO LichSuDangNhap (MaDangNhap, HoTen, PhuongThuc, KetQua, DiaChiIP, UserAgent)
        VALUES (@MaDangNhap, @HoTen, @PhuongThuc, @KetQua, @DiaChiIP, @UserAgent)
      `);
  } catch (err) {
    console.error("[login-history] insert failed:", err);
  }
}

export async function fetchLoginHistory(params: {
  maDangNhap?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<LoginHistoryRow[]> {
  const pool = await getDbPool();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);

  const result = await pool
    .request()
    .input("MaDangNhap", sql.NVarChar(100), params.maDangNhap?.trim() || null)
    .input("Q", sql.NVarChar(255), params.q?.trim() ? `%${params.q.trim()}%` : null)
    .input("Limit", sql.Int, limit)
    .query(`
      SELECT TOP (@Limit) *
      FROM LichSuDangNhap
      WHERE (@MaDangNhap IS NULL OR MaDangNhap = @MaDangNhap)
        AND (
          @Q IS NULL
          OR MaDangNhap LIKE @Q
          OR HoTen LIKE @Q
          OR DiaChiIP LIKE @Q
          OR UserAgent LIKE @Q
        )
      ORDER BY NgayGio DESC, ID DESC
    `);

  return (result.recordset as Record<string, unknown>[]).map(mapRow);
}
