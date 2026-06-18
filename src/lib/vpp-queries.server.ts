import { getDbPool, sql } from "./db.server";
import {
  createAuditFields,
  deleteAuditFields,
  diffAuditFields,
  DINH_MUC_AUDIT_FIELDS,
  fetchAuditLogGroups,
  NHAN_VIEN_AUDIT_FIELDS,
  VAT_TU_AUDIT_FIELDS,
  writeAuditLog,
} from "./audit.server";
import type {
  AuditLogGroup,
  BoPhanRow,
  DinhMucRow,
  HangDaCapThuHoiRow,
  NhanVienRow,
  ThuHoiDaCapResult,
  ThuHoiNhanVienLookup,
  TienDoDinhMucRow,
  VatTuRow,
  VoucherDetail,
  VoucherSummary,
} from "./types/vpp";
import { DONG_PHUC_PREFIX_ORDER } from "./dong-phuc-catalog";
import { assertValidMaHang, defaultHinhAnhForMaHang, PROD_MA_HANG_PREFIX } from "./vat-tu-catalog";
import { normalizeVatTuImagePath } from "./vat-tu-image";
import { formatBhldTrangThai } from "./bhld";
import {
  resolveChucDanh,
  resolveChucDanhLabel,
  resolveDinhMucGhiChu,
  resolveDonViTinh,
  resolveHoTen,
  resolveNhomHang,
  resolveTenBoPhan as fixTenBoPhan,
  resolveTenSanPham,
  resolveTrangThai,
} from "./vietnamese-text";

function toNumber(value: unknown): number {
  if (value == null) return 0;
  return Number(value);
}

function formatDateTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleString("vi-VN", { hour12: false });
  }
  return String(value ?? "");
}

function mapVatTuRow(row: Record<string, unknown>): VatTuRow {
  const rawHinhAnh = row.HinhAnh != null ? String(row.HinhAnh) : null;
  const maHang = String(row.MaHang);
  return {
    maHang,
    tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
    donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
    nhomHang: resolveNhomHang(maHang, row.NhomHang != null ? String(row.NhomHang) : null),
    donGia: toNumber(row.DonGia),
    minStock: toNumber(row.MinStock),
    soLuongTon: toNumber(row.SoLuongTon),
    hinhAnh: rawHinhAnh ? normalizeVatTuImagePath(rawHinhAnh) : null,
  };
}

export async function fetchVatTuList(): Promise<VatTuRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      v.MaHang,
      v.TenSanPham,
      v.DonViTinh,
      v.NhomHang,
      v.DonGia,
      v.MinStock,
      v.HinhAnh,
      ISNULL(t.SoLuongTon, 0) AS SoLuongTon
    FROM DanhMucVatTu v
    LEFT JOIN TonKhoHienTai t ON t.MaHang = v.MaHang
    ORDER BY v.MaHang
  `);

  return result.recordset.map((row: Record<string, unknown>) => mapVatTuRow(row));
}

export { isProdMaHang, PROD_MA_HANG_PREFIX } from "./vat-tu-catalog";

export type MaHangSuggestPrefix = "PROD" | "BHLD";

export async function fetchNextMaHang(prefix: MaHangSuggestPrefix): Promise<string> {
  const pool = await getDbPool();
  if (prefix === "PROD") {
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(TRY_CAST(SUBSTRING(MaHang, 6, 20) AS INT)), 0) + 1 AS NextNum
      FROM DanhMucVatTu
      WHERE MaHang LIKE 'PROD-%'
    `);
    const next = Number(result.recordset[0]?.NextNum ?? 1);
    return `${PROD_MA_HANG_PREFIX}${String(next).padStart(4, "0")}`;
  }

  const result = await pool.request().query(`
    SELECT ISNULL(MAX(TRY_CAST(
      CASE
        WHEN MaHang LIKE 'BHLD-[0-9]%' THEN SUBSTRING(MaHang, 6, 20)
        ELSE NULL
      END AS INT)), 0) + 1 AS NextNum
    FROM DanhMucVatTu
    WHERE MaHang LIKE 'BHLD-%'
  `);
  const next = Number(result.recordset[0]?.NextNum ?? 1);
  return `BHLD-${String(next).padStart(3, "0")}`;
}

/** @deprecated Dùng fetchNextMaHang('PROD') */
export async function fetchNextProdMaHang(): Promise<string> {
  return fetchNextMaHang("PROD");
}

/** @deprecated Dùng fetchVatTuList */
export async function fetchProdList(): Promise<VatTuRow[]> {
  return fetchVatTuList();
}

export async function fetchVatTuByMaHang(maHang: string): Promise<VatTuRow | null> {
  const pool = await getDbPool();
  const result = await pool
    .request()
    .input("MaHang", sql.VarChar(50), maHang)
    .query(`
      SELECT
        v.MaHang,
        v.TenSanPham,
        v.DonViTinh,
        v.NhomHang,
        v.DonGia,
        v.MinStock,
        v.HinhAnh,
        ISNULL(t.SoLuongTon, 0) AS SoLuongTon
      FROM DanhMucVatTu v
      LEFT JOIN TonKhoHienTai t ON t.MaHang = v.MaHang
      WHERE v.MaHang = @MaHang
    `);
  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row ? mapVatTuRow(row) : null;
}

function vatTuAuditSnapshot(row: {
  tenSanPham: string;
  donViTinh: string;
  nhomHang?: string | null;
  donGia: number;
  minStock: number;
  hinhAnh?: string | null;
}) {
  return {
    tenSanPham: row.tenSanPham,
    donViTinh: row.donViTinh,
    nhomHang: row.nhomHang,
    donGia: row.donGia,
    minStock: row.minStock,
    hinhAnh: row.hinhAnh,
  };
}

function resolveStoredHinhAnh(maHang: string, hinhAnh?: string | null): string {
  const raw = hinhAnh?.trim();
  if (!raw || raw.startsWith("data:")) return defaultHinhAnhForMaHang(maHang);
  return normalizeVatTuImagePath(raw) ?? defaultHinhAnhForMaHang(maHang);
}

export async function insertVatTu(data: {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  nhomHang?: string | null;
  donGia?: number;
  minStock?: number;
  hinhAnh?: string | null;
  changedBy?: string | null;
}): Promise<void> {
  const maHang = assertValidMaHang(data.maHang);

  const existing = await fetchVatTuByMaHang(maHang);
  if (existing) throw new Error(`Mã hàng ${maHang} đã tồn tại.`);

  const pool = await getDbPool();
  const nhomHang = data.nhomHang?.trim() || null;
  const donGia = data.donGia ?? 0;
  const minStock = data.minStock ?? 0;
  const hinhAnh = resolveStoredHinhAnh(maHang, data.hinhAnh);

  await pool
    .request()
    .input("MaHang", sql.VarChar(50), maHang)
    .input("TenSanPham", sql.NVarChar(500), data.tenSanPham.trim())
    .input("DonViTinh", sql.NVarChar(50), data.donViTinh.trim())
    .input("NhomHang", sql.NVarChar(100), nhomHang)
    .input("DonGia", sql.Decimal(18, 2), donGia)
    .input("MinStock", sql.Decimal(18, 2), minStock)
    .input("HinhAnh", sql.NVarChar(500), hinhAnh)
    .query(`
      INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock, HinhAnh)
      VALUES (@MaHang, @TenSanPham, @DonViTinh, @NhomHang, @DonGia, @MinStock, @HinhAnh);

      INSERT INTO TonKhoHienTai (MaHang, SoLuongTon)
      VALUES (@MaHang, 0);
    `);

  await writeAuditLog({
    bangDuLieu: "DanhMucVatTu",
    maBanGhi: maHang,
    hanhDong: "CREATE",
    nguoiThayDoi: data.changedBy,
    changes: createAuditFields(
      vatTuAuditSnapshot({
        tenSanPham: data.tenSanPham.trim(),
        donViTinh: data.donViTinh.trim(),
        nhomHang,
        donGia,
        minStock,
        hinhAnh,
      }),
      [...VAT_TU_AUDIT_FIELDS],
    ),
  });
}

/** @deprecated Dùng insertVatTu */
export const insertProdVatTu = insertVatTu;

export async function updateVatTu(data: {
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  nhomHang?: string | null;
  donGia: number;
  minStock: number;
  hinhAnh?: string | null;
  changedBy?: string | null;
}): Promise<void> {
  const maHang = assertValidMaHang(data.maHang);

  const before = await fetchVatTuByMaHang(maHang);
  if (!before) throw new Error("Không tìm thấy vật tư cần cập nhật.");

  const nhomHang = data.nhomHang?.trim() || null;
  const hinhAnh = resolveStoredHinhAnh(maHang, data.hinhAnh);
  const pool = await getDbPool();

  await pool
    .request()
    .input("MaHang", sql.VarChar(50), maHang)
    .input("TenSanPham", sql.NVarChar(500), data.tenSanPham.trim())
    .input("DonViTinh", sql.NVarChar(50), data.donViTinh.trim())
    .input("NhomHang", sql.NVarChar(100), nhomHang)
    .input("DonGia", sql.Decimal(18, 2), data.donGia)
    .input("MinStock", sql.Decimal(18, 2), data.minStock)
    .input("HinhAnh", sql.NVarChar(500), hinhAnh)
    .query(`
      UPDATE DanhMucVatTu
      SET TenSanPham = @TenSanPham,
          DonViTinh = @DonViTinh,
          NhomHang = @NhomHang,
          DonGia = @DonGia,
          MinStock = @MinStock,
          HinhAnh = @HinhAnh
      WHERE MaHang = @MaHang
    `);

  const changes = diffAuditFields(
    vatTuAuditSnapshot(before),
    vatTuAuditSnapshot({
      tenSanPham: data.tenSanPham.trim(),
      donViTinh: data.donViTinh.trim(),
      nhomHang,
      donGia: data.donGia,
      minStock: data.minStock,
      hinhAnh,
    }),
    [...VAT_TU_AUDIT_FIELDS],
  );

  await writeAuditLog({
    bangDuLieu: "DanhMucVatTu",
    maBanGhi: maHang,
    hanhDong: "UPDATE",
    nguoiThayDoi: data.changedBy,
    changes,
  });
}

/** @deprecated Dùng updateVatTu */
export const updateProdVatTu = updateVatTu;

export async function deleteVatTu(maHang: string, changedBy?: string | null): Promise<void> {
  const code = assertValidMaHang(maHang);

  const item = await fetchVatTuByMaHang(code);
  if (!item) throw new Error("Không tìm thấy vật tư cần xóa.");
  if (item.soLuongTon > 0) {
    throw new Error("Không xóa được vật tư còn tồn kho. Hãy xuất hết hoặc điều chỉnh qua phiếu.");
  }

  const pool = await getDbPool();
  const used = await pool.request().input("MaHang", sql.VarChar(50), code).query(`
    SELECT TOP 1 1 AS Used
    FROM ChiTietGiaoDich
    WHERE MaHang = @MaHang
  `);
  if (used.recordset.length > 0) {
    throw new Error("Vật tư đã có trong phiếu giao dịch, không thể xóa.");
  }

  const dinhMuc = await pool.request().input("MaHang", sql.VarChar(50), code).query(`
    SELECT TOP 1 1 AS Used FROM DinhMucCapPhat WHERE MaHang = @MaHang
  `);
  if (dinhMuc.recordset.length > 0) {
    throw new Error("Vật tư đang được cấu hình định mức, hãy xóa định mức trước.");
  }

  await pool.request().input("MaHang", sql.VarChar(50), code).query(`
    DELETE FROM TonKhoHienTai WHERE MaHang = @MaHang;
    DELETE FROM DanhMucVatTu WHERE MaHang = @MaHang;
  `);

  await writeAuditLog({
    bangDuLieu: "DanhMucVatTu",
    maBanGhi: code,
    hanhDong: "DELETE",
    nguoiThayDoi: changedBy,
    changes: deleteAuditFields(vatTuAuditSnapshot(item), [...VAT_TU_AUDIT_FIELDS]),
  });
}

/** @deprecated Dùng deleteVatTu */
export const deleteProdVatTu = deleteVatTu;

export async function fetchBoPhanList(): Promise<BoPhanRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT ID, MaBoPhan, TenBoPhan
    FROM DanhMucBoPhan
    ORDER BY
      CASE MaBoPhan
        WHEN 'HG'  THEN 1
        WHEN 'EQM' THEN 2
        WHEN 'SX'  THEN 3
        WHEN 'MM'  THEN 4
        WHEN 'SM'  THEN 5
        WHEN 'CS'  THEN 6
        WHEN 'QC'  THEN 7
        ELSE 99
      END,
      TenBoPhan
  `);

  return result.recordset.map((row: Record<string, unknown>) => ({
    id: Number(row.ID),
    maBoPhan: row.MaBoPhan != null ? String(row.MaBoPhan) : null,
    tenBoPhan: fixTenBoPhan(
      row.MaBoPhan != null ? String(row.MaBoPhan) : null,
      String(row.TenBoPhan),
    ) ?? String(row.TenBoPhan),
  }));
}

function mapNhanVienRow(row: Record<string, unknown>): NhanVienRow {
  const maNV = String(row.MaNV);
  const maBoPhan = row.MaBoPhan != null ? String(row.MaBoPhan) : null;
  return {
    id: Number(row.ID),
    maNV,
    hoTen: resolveHoTen(maNV, String(row.HoTen)),
    chucDanh: resolveChucDanh(maNV, row.ChucDanh != null ? String(row.ChucDanh) : null),
    boPhanId: row.BoPhanID != null ? Number(row.BoPhanID) : null,
    maBoPhan,
    tenBoPhan: fixTenBoPhan(maBoPhan, row.TenBoPhan != null ? String(row.TenBoPhan) : null),
    sizeAo: row.SizeAo != null ? String(row.SizeAo) : null,
    sizeGiay: row.SizeGiay != null ? String(row.SizeGiay) : null,
    trangThai: resolveTrangThai(row.TrangThai != null ? String(row.TrangThai) : null),
  };
}

/** Danh sách đầy đủ từ view — dùng trang /staff */
export async function fetchNhanVienFullList(): Promise<NhanVienRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT * FROM v_DanhSachNhanVienChiTiet ORDER BY MaNV
  `);
  return result.recordset.map((row: Record<string, unknown>) => mapNhanVienRow(row));
}

/** Chỉ nhân viên đang làm việc — dùng form xuất kho */
export async function fetchNhanVienList(): Promise<NhanVienRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT * FROM v_DanhSachNhanVienChiTiet
    WHERE TrangThai IS NULL
       OR TrangThai = N'Đang làm việc'
       OR (TrangThai NOT LIKE N'%nghỉ việc%' AND TrangThai NOT LIKE N'%Nghỉ việc%')
    ORDER BY HoTen
  `);
  return result.recordset.map((row: Record<string, unknown>) => mapNhanVienRow(row));
}

export async function insertNhanVien(data: {
  maNV: string;
  hoTen: string;
  chucDanh?: string | null;
  boPhanId?: number | null;
  sizeAo?: string | null;
  sizeGiay?: string | null;
  trangThai?: string;
  changedBy?: string | null;
}): Promise<void> {
  const pool = await getDbPool();
  const tenBoPhan = await fetchTenBoPhanById(data.boPhanId ?? null);

  await pool
    .request()
    .input("MaNV", sql.VarChar(50), data.maNV)
    .input("HoTen", sql.NVarChar(255), data.hoTen)
    .input("ChucDanh", sql.NVarChar(100), data.chucDanh ?? null)
    .input("BoPhanID", sql.Int, data.boPhanId ?? null)
    .input("SizeAo", sql.VarChar(10), data.sizeAo ?? null)
    .input("SizeGiay", sql.VarChar(10), data.sizeGiay ?? null)
    .input("TrangThai", sql.NVarChar(50), data.trangThai ?? "Đang làm việc")
    .query(`
      INSERT INTO DanhMucNhanVien (MaNV, HoTen, ChucDanh, BoPhanID, SizeAo, SizeGiay, TrangThai)
      VALUES (@MaNV, @HoTen, @ChucDanh, @BoPhanID, @SizeAo, @SizeGiay, @TrangThai)
    `);

  await writeAuditLog({
    bangDuLieu: "DanhMucNhanVien",
    maBanGhi: data.maNV.trim(),
    hanhDong: "CREATE",
    nguoiThayDoi: data.changedBy,
    changes: createAuditFields(
      {
        hoTen: data.hoTen,
        chucDanh: data.chucDanh,
        tenBoPhan,
        sizeAo: data.sizeAo,
        sizeGiay: data.sizeGiay,
        trangThai: data.trangThai ?? "Đang làm việc",
      },
      [...NHAN_VIEN_AUDIT_FIELDS],
    ),
  });
}

async function fetchNhanVienById(id: number): Promise<NhanVienRow | null> {
  const pool = await getDbPool();
  const result = await pool.request().input("ID", sql.Int, id).query(`
    SELECT * FROM v_DanhSachNhanVienChiTiet WHERE ID = @ID
  `);
  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row ? mapNhanVienRow(row) : null;
}

async function fetchTenBoPhanById(boPhanId: number | null): Promise<string | null> {
  if (boPhanId == null) return null;
  const pool = await getDbPool();
  const result = await pool.request().input("ID", sql.Int, boPhanId).query(`
    SELECT TenBoPhan FROM DanhMucBoPhan WHERE ID = @ID
  `);
  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row?.TenBoPhan != null ? String(row.TenBoPhan) : null;
}

function nhanVienAuditSnapshot(row: {
  hoTen: string;
  chucDanh?: string | null;
  tenBoPhan?: string | null;
  sizeAo?: string | null;
  sizeGiay?: string | null;
  trangThai: string;
}) {
  return {
    hoTen: row.hoTen,
    chucDanh: row.chucDanh,
    tenBoPhan: row.tenBoPhan,
    sizeAo: row.sizeAo,
    sizeGiay: row.sizeGiay,
    trangThai: row.trangThai,
  };
}

export async function updateNhanVien(data: {
  id: number;
  hoTen: string;
  chucDanh?: string | null;
  boPhanId?: number | null;
  sizeAo?: string | null;
  sizeGiay?: string | null;
  trangThai: string;
  changedBy?: string | null;
}): Promise<void> {
  const before = await fetchNhanVienById(data.id);
  if (!before) throw new Error("Không tìm thấy nhân viên cần cập nhật.");

  const tenBoPhan = await fetchTenBoPhanById(data.boPhanId ?? null);
  const pool = await getDbPool();
  await pool
    .request()
    .input("ID", sql.Int, data.id)
    .input("HoTen", sql.NVarChar(255), data.hoTen)
    .input("ChucDanh", sql.NVarChar(100), data.chucDanh ?? null)
    .input("BoPhanID", sql.Int, data.boPhanId ?? null)
    .input("SizeAo", sql.VarChar(10), data.sizeAo ?? null)
    .input("SizeGiay", sql.VarChar(10), data.sizeGiay ?? null)
    .input("TrangThai", sql.NVarChar(50), data.trangThai)
    .query(`
      UPDATE DanhMucNhanVien
      SET HoTen = @HoTen, ChucDanh = @ChucDanh, BoPhanID = @BoPhanID,
          SizeAo = @SizeAo, SizeGiay = @SizeGiay, TrangThai = @TrangThai
      WHERE ID = @ID
    `);

  const changes = diffAuditFields(
    nhanVienAuditSnapshot(before),
    nhanVienAuditSnapshot({ ...data, tenBoPhan }),
    [...NHAN_VIEN_AUDIT_FIELDS],
  );

  await writeAuditLog({
    bangDuLieu: "DanhMucNhanVien",
    maBanGhi: before.maNV,
    hanhDong: "UPDATE",
    nguoiThayDoi: data.changedBy,
    changes,
  });
}

export async function fetchVoucherSummaries(): Promise<VoucherSummary[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      p.ID,
      p.SoPhieu,
      p.LoaiPhieu,
      p.NgayLap,
      p.NguoiLap,
      p.GhiChu,
      bp.TenBoPhan,
      bp.MaBoPhan,
      nv.MaNV,
      nv.HoTen,
      p.TenNguoiNhan,
      p.SoNhanVienCap,
      COUNT(ct.ID) AS LineCount,
      ISNULL(SUM(ct.SoLuong), 0) AS TotalQty
    FROM PhieuGiaoDich p
    LEFT JOIN DanhMucBoPhan bp ON bp.ID = p.BoPhanNhanID
    LEFT JOIN DanhMucNhanVien nv ON nv.ID = p.NhanVienNhanID
    LEFT JOIN ChiTietGiaoDich ct ON ct.PhieuID = p.ID
    GROUP BY
      p.ID, p.SoPhieu, p.LoaiPhieu, p.NgayLap, p.NguoiLap, p.GhiChu,
      bp.TenBoPhan, bp.MaBoPhan, nv.MaNV, nv.HoTen, p.TenNguoiNhan, p.SoNhanVienCap
    ORDER BY p.NgayLap DESC, p.ID DESC
  `);

  return result.recordset.map((row: Record<string, unknown>) => {
    const loaiPhieu = String(row.LoaiPhieu) as VoucherSummary["loaiPhieu"];
    const maNV = row.MaNV != null ? String(row.MaNV) : "";
    const hoTenRaw = row.HoTen != null ? String(row.HoTen) : null;
    const tenNguoiNhanRaw = row.TenNguoiNhan != null ? String(row.TenNguoiNhan) : null;
    const hoTen = hoTenRaw ? (maNV ? resolveHoTen(maNV, hoTenRaw) : hoTenRaw) : null;
    const tenNguoiNhan = tenNguoiNhanRaw
      ? maNV
        ? resolveHoTen(maNV, tenNguoiNhanRaw)
        : tenNguoiNhanRaw
      : null;
    const displayName = hoTen ?? tenNguoiNhan;
    const maBoPhan = row.MaBoPhan != null ? String(row.MaBoPhan) : null;
    const tenBoPhan = fixTenBoPhan(maBoPhan, row.TenBoPhan != null ? String(row.TenBoPhan) : null);

    return {
      id: Number(row.ID),
      soPhieu: String(row.SoPhieu),
      loaiPhieu,
      ngayLap: formatDateTime(row.NgayLap),
      nguoiLap: row.NguoiLap != null ? String(row.NguoiLap) : null,
      ghiChu: row.GhiChu != null ? String(row.GhiChu) : null,
      tenBoPhan,
      maBoPhan: row.MaBoPhan != null ? String(row.MaBoPhan) : null,
      maNV: row.MaNV != null ? String(row.MaNV) : null,
      hoTen,
      tenNguoiNhan,
      soNhanVienCap: row.SoNhanVienCap != null ? Number(row.SoNhanVienCap) : null,
      lineCount: Number(row.LineCount),
      totalQty: toNumber(row.TotalQty),
      recipient:
        loaiPhieu === "NHAP"
          ? "Nhập kho — NCC"
          : loaiPhieu === "THU_HOI_BHLD"
            ? (displayName ?? tenBoPhan ?? "Thu hồi BHLĐ")
          : loaiPhieu === "THU_HOI"
            ? (hoTen ?? tenBoPhan ?? "Thu hồi kho")
            : loaiPhieu === "XUAT_CUOC_NV" || loaiPhieu === "XUAT_CUOC_CN"
              ? (displayName ?? "—")
            : loaiPhieu === "XUAT_CUOC_PB"
              ? (tenBoPhan ?? displayName ?? "—")
            : loaiPhieu === "XUAT_CN"
              ? (displayName ?? "—")
              : (tenBoPhan ?? hoTen ?? "—"),
      department:
        loaiPhieu === "NHAP"
          ? "Nhà cung cấp"
          : loaiPhieu === "THU_HOI_BHLD"
            ? (tenBoPhan ?? "Nội bộ")
          : loaiPhieu === "THU_HOI"
            ? (tenBoPhan ?? "—")
            : (tenBoPhan ?? "—"),
    };
  });
}

export async function fetchVoucherBySoPhieu(soPhieu: string): Promise<VoucherDetail | null> {
  const summaries = await fetchVoucherSummaries();
  const header = summaries.find((v) => v.soPhieu === soPhieu);
  if (!header) return null;

  const pool = await getDbPool();
  const linesResult = await pool.request().input("SoPhieu", sql.VarChar(50), soPhieu).query(`
    SELECT
      ct.MaHang,
      v.TenSanPham,
      v.DonViTinh,
      v.HinhAnh,
      ct.SoLuong,
      ct.DonGia,
      ct.ThanhTien,
      ct.NgayCap,
      ct.NgayThuHoi,
      ct.SoThangSuDung,
      ct.TrangThaiHang,
      ct.GhiChuDong
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON p.ID = ct.PhieuID
    INNER JOIN DanhMucVatTu v ON v.MaHang = ct.MaHang
    WHERE p.SoPhieu = @SoPhieu
    ORDER BY ct.ID
  `);

  const lines = linesResult.recordset.map((row: Record<string, unknown>) => {
    const maHang = String(row.MaHang);
    return {
      maHang,
      tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
      donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
      hinhAnh: row.HinhAnh != null ? String(row.HinhAnh) : null,
      soLuong: toNumber(row.SoLuong),
      donGia: toNumber(row.DonGia),
      thanhTien: toNumber(row.ThanhTien),
      ngayCap: row.NgayCap instanceof Date ? row.NgayCap.toISOString().slice(0, 10) : row.NgayCap != null ? String(row.NgayCap).slice(0, 10) : null,
      ngayThuHoi: row.NgayThuHoi instanceof Date ? row.NgayThuHoi.toISOString().slice(0, 10) : row.NgayThuHoi != null ? String(row.NgayThuHoi).slice(0, 10) : null,
      soThangSuDung: row.SoThangSuDung != null ? Number(row.SoThangSuDung) : null,
      trangThaiHang: row.TrangThaiHang != null ? formatBhldTrangThai(String(row.TrangThaiHang)) : null,
      ghiChuDong: row.GhiChuDong != null ? String(row.GhiChuDong) : null,
    };
  });

  return { ...header, lines };
}

export async function generateSoPhieuNhap(): Promise<string> {
  const pool = await getDbPool();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PN${yy}${mm}`;

  const result = await pool.request().input("Prefix", sql.VarChar(10), `${prefix}%`).query(`
    SELECT ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1 AS NextSeq
    FROM PhieuGiaoDich
    WHERE SoPhieu LIKE @Prefix
  `);

  const nextSeq = Number(result.recordset[0]?.NextSeq ?? 1);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateSoPhieuXuat(): Promise<string> {
  const pool = await getDbPool();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PX${yy}${mm}`;

  const result = await pool.request().input("Prefix", sql.VarChar(10), `${prefix}%`).query(`
    SELECT ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1 AS NextSeq
    FROM PhieuGiaoDich
    WHERE SoPhieu LIKE @Prefix
  `);

  const nextSeq = Number(result.recordset[0]?.NextSeq ?? 1);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateSoPhieuThuHoi(): Promise<string> {
  const pool = await getDbPool();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `TH${yy}${mm}`;

  const result = await pool.request().input("Prefix", sql.VarChar(10), `${prefix}%`).query(`
    SELECT ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1 AS NextSeq
    FROM PhieuGiaoDich
    WHERE SoPhieu LIKE @Prefix
  `);

  const nextSeq = Number(result.recordset[0]?.NextSeq ?? 1);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateSoPhieuCuocDo(): Promise<string> {
  const pool = await getDbPool();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `CD${yy}${mm}`;

  const result = await pool.request().input("Prefix", sql.VarChar(10), `${prefix}%`).query(`
    SELECT ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1 AS NextSeq
    FROM PhieuGiaoDich
    WHERE SoPhieu LIKE @Prefix
  `);

  const nextSeq = Number(result.recordset[0]?.NextSeq ?? 1);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function generateSoPhieuThuHoiBhld(): Promise<string> {
  const pool = await getDbPool();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `TB${yy}${mm}`;

  const result = await pool.request().input("Prefix", sql.VarChar(10), `${prefix}%`).query(`
    SELECT ISNULL(MAX(TRY_CAST(RIGHT(SoPhieu, 4) AS INT)), 0) + 1 AS NextSeq
    FROM PhieuGiaoDich
    WHERE SoPhieu LIKE @Prefix
  `);

  const nextSeq = Number(result.recordset[0]?.NextSeq ?? 1);
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function fetchVatTuDongPhucList(): Promise<VatTuRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      v.MaHang,
      v.TenSanPham,
      v.DonViTinh,
      v.NhomHang,
      v.DonGia,
      v.MinStock,
      v.HinhAnh,
      ISNULL(t.SoLuongTon, 0) AS SoLuongTon
    FROM DanhMucVatTu v
    LEFT JOIN TonKhoHienTai t ON t.MaHang = v.MaHang
    WHERE v.MaHang LIKE 'CD-%'
    ORDER BY v.MaHang
  `);

  const rows = result.recordset.map((row: Record<string, unknown>) => mapVatTuRow(row));

  const prefixOrder = [...DONG_PHUC_PREFIX_ORDER];
  const sizeOrder = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

  return rows.sort((a, b) => {
    const pa = prefixOrder.findIndex((p) => a.maHang === p || a.maHang.startsWith(`${p}-`));
    const pb = prefixOrder.findIndex((p) => b.maHang === p || b.maHang.startsWith(`${p}-`));
    if (pa !== pb) return pa - pb;
    const sa = sizeOrder.indexOf(a.maHang.split("-").pop() ?? "");
    const sb = sizeOrder.indexOf(b.maHang.split("-").pop() ?? "");
    return sa - sb;
  });
}

/** Cấp phát cược đồ — cùng danh mục & tồn kho với kho hàng. */
export async function fetchVatTuCuocDoList(): Promise<VatTuRow[]> {
  return fetchVatTuDongPhucList();
}

/** Thu hồi đồng phục — cùng danh mục & tồn kho với kho hàng. */
export async function fetchVatTuBhldList(): Promise<VatTuRow[]> {
  return fetchVatTuDongPhucList();
}

export async function fetchCuocDoVoucherSummaries(): Promise<VoucherSummary[]> {
  const all = await fetchVoucherSummaries();
  return all.filter(
    (v) =>
      v.loaiPhieu === "XUAT_CUOC_NV" ||
      v.loaiPhieu === "XUAT_CUOC_CN" ||
      v.loaiPhieu === "XUAT_CUOC_PB",
  );
}

export async function fetchTienDoCuocDoByMaNV(maNV: string): Promise<TienDoDinhMucRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().input("MaNV", sql.VarChar(50), maNV).query(`
    SELECT *
    FROM v_TienDoCuocDoNhanVien
    WHERE MaNV = @MaNV
    ORDER BY MaHang
  `);

  return result.recordset.map((row: Record<string, unknown>) => mapTienDoDinhMucRow(row));
}

export async function execTaoPhieuCuocDoToanBo(params: {
  soPhieu: string;
  loaiPhieu: "XUAT_CUOC_NV" | "XUAT_CUOC_CN" | "XUAT_CUOC_PB";
  nguoiLap: string;
  hoTenNguoiNhan?: string | null;
  maNV?: string | null;
  maBoPhan?: string | null;
  soNhanVienCap?: number | null;
  ghiChu?: string | null;
  danhSachHang: XuatKhoLineInput[];
}): Promise<void> {
  const pool = await getDbPool();
  await pool
    .request()
    .input("SoPhieu", sql.VarChar(50), params.soPhieu)
    .input("LoaiPhieu", sql.VarChar(20), params.loaiPhieu)
    .input("NguoiLap", sql.NVarChar(100), params.nguoiLap)
    .input("HoTenNguoiNhan", sql.NVarChar(255), params.hoTenNguoiNhan ?? null)
    .input("MaNV", sql.VarChar(50), params.maNV?.trim() || null)
    .input("MaBoPhan", sql.VarChar(50), params.maBoPhan?.trim() || null)
    .input("SoNhanVienCap", sql.Int, params.soNhanVienCap ?? null)
    .input("GhiChu", sql.NVarChar(500), params.ghiChu ?? null)
    .input("DanhSachHangJson", sql.NVarChar(sql.MAX), JSON.stringify(params.danhSachHang))
    .execute("sp_TaoPhieuCuocDoToanBo");
}

export interface ReportLineRow {
  soPhieu: string;
  loaiPhieu: string;
  ngayLap: string;
  nguoiLap: string | null;
  maBoPhan: string | null;
  tenBoPhan: string | null;
  recipient: string;
  maHang: string;
  tenSanPham: string;
  donViTinh: string;
  nhomHang: string | null;
  soLuong: number;
}

export async function fetchReportLines(): Promise<ReportLineRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      p.SoPhieu,
      p.LoaiPhieu,
      p.NgayLap,
      p.NguoiLap,
      bp.TenBoPhan,
      bp.MaBoPhan AS PhieuMaBoPhan,
      bp_nv.MaBoPhan AS NvMaBoPhan,
      bp_nv.TenBoPhan AS NvTenBoPhan,
      COALESCE(nv.HoTen, bp.TenBoPhan, N'—') AS Recipient,
      ct.MaHang,
      v.TenSanPham,
      v.DonViTinh,
      v.NhomHang,
      ct.SoLuong
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON p.ID = ct.PhieuID
    INNER JOIN DanhMucVatTu v ON v.MaHang = ct.MaHang
    LEFT JOIN DanhMucBoPhan bp ON bp.ID = p.BoPhanNhanID
    LEFT JOIN DanhMucNhanVien nv ON nv.ID = p.NhanVienNhanID
    LEFT JOIN DanhMucBoPhan bp_nv ON bp_nv.ID = nv.BoPhanID
    ORDER BY p.NgayLap DESC, p.SoPhieu, ct.ID
  `);

  return result.recordset.map((row: Record<string, unknown>) => {
    const maHang = String(row.MaHang);
    const maBoPhan =
      row.PhieuMaBoPhan != null
        ? String(row.PhieuMaBoPhan)
        : row.NvMaBoPhan != null
          ? String(row.NvMaBoPhan)
          : null;
    const tenBoPhanRaw =
      row.TenBoPhan != null
        ? String(row.TenBoPhan)
        : row.NvTenBoPhan != null
          ? String(row.NvTenBoPhan)
          : null;
    return {
      soPhieu: String(row.SoPhieu),
      loaiPhieu: String(row.LoaiPhieu),
      ngayLap: formatDateTime(row.NgayLap),
      nguoiLap: row.NguoiLap != null ? String(row.NguoiLap) : null,
      maBoPhan,
      tenBoPhan: fixTenBoPhan(maBoPhan, tenBoPhanRaw),
      recipient: String(row.Recipient),
      maHang,
      tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
      donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
      nhomHang: resolveNhomHang(maHang, row.NhomHang != null ? String(row.NhomHang) : null),
      soLuong: toNumber(row.SoLuong),
    };
  });
}

export interface NhapKhoLineInput {
  MaHang: string;
  SoLuong: number;
  DonGia: number;
}

export async function execTaoPhieuNhapKho(params: {
  soPhieu: string;
  nguoiLap: string;
  ghiChu?: string | null;
  danhSachHang: NhapKhoLineInput[];
}): Promise<void> {
  const pool = await getDbPool();
  await pool
    .request()
    .input("SoPhieu", sql.VarChar(50), params.soPhieu)
    .input("NguoiLap", sql.NVarChar(100), params.nguoiLap)
    .input("GhiChu", sql.NVarChar(500), params.ghiChu ?? null)
    .input("DanhSachHangJson", sql.NVarChar(sql.MAX), JSON.stringify(params.danhSachHang))
    .execute("sp_TaoPhieuNhapKhoToanBo");
}

export interface XuatKhoLineInput {
  MaHang: string;
  SoLuong: number;
}

export async function execTaoPhieuXuatKhoToanBo(params: {
  soPhieu: string;
  loaiPhieu: "XUAT_CN" | "XUAT_PB";
  nguoiLap: string;
  maBoPhan?: string | null;
  maNV?: string | null;
  ghiChu?: string | null;
  danhSachHang: XuatKhoLineInput[];
}): Promise<void> {
  const pool = await getDbPool();
  await pool
    .request()
    .input("SoPhieu", sql.VarChar(50), params.soPhieu)
    .input("LoaiPhieu", sql.VarChar(20), params.loaiPhieu)
    .input("NguoiLap", sql.NVarChar(100), params.nguoiLap)
    .input("MaBoPhan", sql.VarChar(50), params.maBoPhan ?? null)
    .input("MaNV", sql.VarChar(50), params.maNV ?? null)
    .input("GhiChu", sql.NVarChar(500), params.ghiChu ?? null)
    .input("DanhSachHangJson", sql.NVarChar(sql.MAX), JSON.stringify(params.danhSachHang))
    .execute("sp_TaoPhieuXuatKhoToanBo");
}

export interface BhldThuHoiLineInput {
  MaHang: string;
  SoLuong: number;
  DonGia: number;
}

export async function execTaoPhieuThuHoiBhld(params: {
  soPhieu: string;
  nguoiLap: string;
  maNV?: string | null;
  maBoPhan?: string | null;
  hoTenNguoiTra?: string | null;
  ghiChu?: string | null;
  danhSachHang: BhldThuHoiLineInput[];
}): Promise<void> {
  const pool = await getDbPool();
  await pool
    .request()
    .input("SoPhieu", sql.VarChar(50), params.soPhieu)
    .input("NguoiLap", sql.NVarChar(100), params.nguoiLap)
    .input("MaNV", sql.VarChar(50), params.maNV?.trim() || null)
    .input("MaBoPhan", sql.VarChar(50), params.maBoPhan?.trim() || null)
    .input("HoTenNguoiTra", sql.NVarChar(255), params.hoTenNguoiTra ?? null)
    .input("GhiChu", sql.NVarChar(500), params.ghiChu ?? null)
    .input("DanhSachHangJson", sql.NVarChar(sql.MAX), JSON.stringify(params.danhSachHang))
    .execute("sp_TaoPhieuThuHoiBhld");
}

export async function execTaoPhieuThuHoiKho(params: {
  soPhieu: string;
  nguoiLap: string;
  maBoPhan?: string | null;
  maNV?: string | null;
  ghiChu?: string | null;
  danhSachHang: XuatKhoLineInput[];
}): Promise<void> {
  const pool = await getDbPool();
  await pool
    .request()
    .input("SoPhieu", sql.VarChar(50), params.soPhieu)
    .input("NguoiLap", sql.NVarChar(100), params.nguoiLap)
    .input("MaBoPhan", sql.VarChar(50), params.maBoPhan ?? null)
    .input("MaNV", sql.VarChar(50), params.maNV ?? null)
    .input("GhiChu", sql.NVarChar(500), params.ghiChu ?? null)
    .input("DanhSachHangJson", sql.NVarChar(sql.MAX), JSON.stringify(params.danhSachHang))
    .execute("sp_TaoPhieuThuHoiKho");
}

export async function fetchDinhMucList(): Promise<DinhMucRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      dm.ChucDanh,
      dm.MaHang,
      v.TenSanPham,
      v.DonViTinh,
      dm.SoLuongToiDa,
      dm.GhiChu
    FROM DinhMucCapPhat dm
    INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang
    ORDER BY dm.ChucDanh, dm.MaHang
  `);

  return result.recordset.map((row: Record<string, unknown>) => {
    const maHang = String(row.MaHang);
    return {
      chucDanh: resolveChucDanhLabel(String(row.ChucDanh)) ?? String(row.ChucDanh),
      maHang,
      tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
      donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
      soLuongToiDa: toNumber(row.SoLuongToiDa),
      ghiChu: resolveDinhMucGhiChu(maHang, row.GhiChu != null ? String(row.GhiChu) : null),
    };
  });
}

export async function fetchChucDanhOptions(): Promise<string[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT DISTINCT ChucDanh AS Val FROM (
      SELECT ChucDanh FROM DanhMucNhanVien WHERE ChucDanh IS NOT NULL AND LTRIM(RTRIM(ChucDanh)) <> ''
      UNION
      SELECT ChucDanh FROM DinhMucCapPhat
    ) x
    ORDER BY Val
  `);
  return result.recordset.map((row: Record<string, unknown>) =>
    resolveChucDanhLabel(String(row.Val)) ?? String(row.Val),
  );
}

export async function upsertDinhMuc(data: {
  chucDanh: string;
  maHang: string;
  soLuongToiDa: number;
  ghiChu?: string | null;
  changedBy?: string | null;
}): Promise<void> {
  const pool = await getDbPool();
  const before = await fetchDinhMucRow(data.chucDanh, data.maHang);
  const tenSanPham = before?.tenSanPham ?? (await fetchTenSanPham(data.maHang));

  await pool
    .request()
    .input("ChucDanh", sql.NVarChar(100), data.chucDanh)
    .input("MaHang", sql.VarChar(50), data.maHang)
    .input("SoLuongToiDa", sql.Decimal(18, 2), data.soLuongToiDa)
    .input("GhiChu", sql.NVarChar(500), data.ghiChu ?? null)
    .query(`
      MERGE DinhMucCapPhat AS target
      USING (SELECT @ChucDanh AS ChucDanh, @MaHang AS MaHang) AS source
      ON (target.ChucDanh = source.ChucDanh AND target.MaHang = source.MaHang)
      WHEN MATCHED THEN
        UPDATE SET target.SoLuongToiDa = @SoLuongToiDa, target.GhiChu = @GhiChu
      WHEN NOT MATCHED THEN
        INSERT (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
        VALUES (source.ChucDanh, source.MaHang, @SoLuongToiDa, @GhiChu);
    `);

  const after = {
    chucDanh: data.chucDanh,
    maHang: data.maHang,
    tenSanPham,
    soLuongToiDa: data.soLuongToiDa,
    ghiChu: data.ghiChu ?? null,
  };
  const maBanGhi = `${data.chucDanh}|${data.maHang}`;

  if (before) {
    const changes = diffAuditFields(
      {
        chucDanh: before.chucDanh,
        maHang: before.maHang,
        tenSanPham: before.tenSanPham,
        soLuongToiDa: before.soLuongToiDa,
        ghiChu: before.ghiChu,
      },
      after,
      [...DINH_MUC_AUDIT_FIELDS],
    );
    await writeAuditLog({
      bangDuLieu: "DinhMucCapPhat",
      maBanGhi,
      hanhDong: "UPDATE",
      nguoiThayDoi: data.changedBy,
      changes,
    });
  } else {
    await writeAuditLog({
      bangDuLieu: "DinhMucCapPhat",
      maBanGhi,
      hanhDong: "CREATE",
      nguoiThayDoi: data.changedBy,
      changes: createAuditFields(after, [...DINH_MUC_AUDIT_FIELDS]),
    });
  }
}

async function fetchDinhMucRow(chucDanh: string, maHang: string): Promise<DinhMucRow | null> {
  const pool = await getDbPool();
  const result = await pool
    .request()
    .input("ChucDanh", sql.NVarChar(100), chucDanh)
    .input("MaHang", sql.VarChar(50), maHang)
    .query(`
      SELECT
        dm.ChucDanh,
        dm.MaHang,
        v.TenSanPham,
        v.DonViTinh,
        dm.SoLuongToiDa,
        dm.GhiChu
      FROM DinhMucCapPhat dm
      INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang
      WHERE dm.ChucDanh = @ChucDanh AND dm.MaHang = @MaHang
    `);

  const row = result.recordset[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    chucDanh: resolveChucDanhLabel(String(row.ChucDanh)) ?? String(row.ChucDanh),
    maHang,
    tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
    donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
    soLuongToiDa: toNumber(row.SoLuongToiDa),
    ghiChu: resolveDinhMucGhiChu(maHang, row.GhiChu != null ? String(row.GhiChu) : null),
  };
}

async function fetchTenSanPham(maHang: string): Promise<string | null> {
  const pool = await getDbPool();
  const result = await pool.request().input("MaHang", sql.VarChar(50), maHang).query(`
    SELECT TenSanPham FROM DanhMucVatTu WHERE MaHang = @MaHang
  `);
  const row = result.recordset[0] as Record<string, unknown> | undefined;
  return row?.TenSanPham != null ? String(row.TenSanPham) : null;
}

export async function deleteDinhMuc(
  chucDanh: string,
  maHang: string,
  changedBy?: string | null,
): Promise<void> {
  const before = await fetchDinhMucRow(chucDanh, maHang);
  if (!before) return;

  const pool = await getDbPool();
  await pool
    .request()
    .input("ChucDanh", sql.NVarChar(100), chucDanh)
    .input("MaHang", sql.VarChar(50), maHang)
    .query(`DELETE FROM DinhMucCapPhat WHERE ChucDanh = @ChucDanh AND MaHang = @MaHang`);

  await writeAuditLog({
    bangDuLieu: "DinhMucCapPhat",
    maBanGhi: `${chucDanh}|${maHang}`,
    hanhDong: "DELETE",
    nguoiThayDoi: changedBy,
    changes: deleteAuditFields(
      {
        chucDanh: before.chucDanh,
        maHang: before.maHang,
        tenSanPham: before.tenSanPham,
        soLuongToiDa: before.soLuongToiDa,
        ghiChu: before.ghiChu,
      },
      [...DINH_MUC_AUDIT_FIELDS],
    ),
  });
}

function mapTienDoDinhMucRow(row: Record<string, unknown>): TienDoDinhMucRow {
  const maNV = String(row.MaNV);
  const maHang = String(row.MaHang);
  return {
    nhanVienId: Number(row.NhanVienID),
    maNV,
    hoTen: resolveHoTen(maNV, String(row.HoTen)),
    chucDanh: resolveChucDanhLabel(String(row.ChucDanh)) ?? String(row.ChucDanh),
    maHang,
    tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
    donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
    soLuongToiDa: toNumber(row.SoLuongToiDa),
    daDung: toNumber(row.DaDung),
    conLai: toNumber(row.ConLai),
    phanTramDaDung: toNumber(row.PhanTramDaDung),
  };
}

export async function fetchTienDoDinhMucByMaNV(maNV: string): Promise<TienDoDinhMucRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().input("MaNV", sql.VarChar(50), maNV).query(`
    SELECT *
    FROM v_TienDoDinhMucNhanVien
    WHERE MaNV = @MaNV
    ORDER BY MaHang
  `);

  return result.recordset.map((row: Record<string, unknown>) => mapTienDoDinhMucRow(row));
}

export async function fetchDashboardQuotaAlerts(): Promise<TienDoDinhMucRow[]> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT *
    FROM v_TienDoDinhMucNhanVien
    WHERE PhanTramDaDung >= 75
    ORDER BY PhanTramDaDung DESC, MaNV ASC
  `);

  return result.recordset.map((row: Record<string, unknown>) => mapTienDoDinhMucRow(row));
}

/** Tổng hợp hàng CD-* đã cấp (cược đồ) trừ đã thu hồi BHLĐ cho một nhân viên. */
export async function fetchHangDaCapChoThuHoi(
  maNV: string,
  hoTen?: string | null,
): Promise<ThuHoiDaCapResult> {
  const code = maNV.trim();
  const name = hoTen?.trim() ?? "";
  if (!code && !name) return { nhanVien: null, items: [] };

  const pool = await getDbPool();
  const result = await pool
    .request()
    .input("MaNV", sql.VarChar(50), code || null)
    .input("HoTen", sql.NVarChar(255), name || null)
    .query(`
      DECLARE @NhanVienID INT = NULL;
      IF @MaNV IS NOT NULL AND LTRIM(RTRIM(@MaNV)) <> ''
        SELECT @NhanVienID = ID FROM DanhMucNhanVien WHERE MaNV = LTRIM(RTRIM(@MaNV));

      SELECT TOP 1
        nv.MaNV,
        nv.HoTen,
        nv.ChucDanh,
        bp.MaBoPhan,
        bp.TenBoPhan
      FROM DanhMucNhanVien nv
      LEFT JOIN DanhMucBoPhan bp ON bp.ID = nv.BoPhanID
      WHERE (@NhanVienID IS NOT NULL AND nv.ID = @NhanVienID)
         OR (
           @HoTen IS NOT NULL AND LTRIM(RTRIM(@HoTen)) <> ''
           AND nv.HoTen = LTRIM(RTRIM(@HoTen))
         )
      ORDER BY CASE WHEN nv.MaNV = LTRIM(RTRIM(@MaNV)) THEN 0 ELSE 1 END;

      SELECT
        ct.MaHang,
        v.TenSanPham,
        v.DonViTinh,
        SUM(
          CASE
            WHEN p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN') THEN ct.SoLuong
            WHEN p.LoaiPhieu = 'THU_HOI_BHLD' THEN -ct.SoLuong
            ELSE 0
          END
        ) AS SoLuongConLai,
        MIN(CASE WHEN p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN') THEN CAST(p.NgayLap AS DATE) END) AS NgayCapDau
      FROM ChiTietGiaoDich ct
      INNER JOIN PhieuGiaoDich p ON p.ID = ct.PhieuID
      INNER JOIN DanhMucVatTu v ON v.MaHang = ct.MaHang
      WHERE v.MaHang LIKE 'CD-%'
        AND p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN', 'THU_HOI_BHLD')
        AND (
          (@NhanVienID IS NOT NULL AND p.NhanVienNhanID = @NhanVienID)
          OR (
            @HoTen IS NOT NULL AND LTRIM(RTRIM(@HoTen)) <> ''
            AND p.TenNguoiNhan = LTRIM(RTRIM(@HoTen))
          )
        )
      GROUP BY ct.MaHang, v.TenSanPham, v.DonViTinh
      HAVING SUM(
        CASE
          WHEN p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN') THEN ct.SoLuong
          WHEN p.LoaiPhieu = 'THU_HOI_BHLD' THEN -ct.SoLuong
          ELSE 0
        END
      ) > 0
      ORDER BY ct.MaHang
    `);

  const nvRow = (result.recordsets as Record<string, unknown>[][])[0]?.[0];
  const itemRows = (result.recordsets as Record<string, unknown>[][])[1] ?? [];

  const nhanVien: ThuHoiNhanVienLookup | null = nvRow
    ? {
        maNV: String(nvRow.MaNV),
        hoTen: resolveHoTen(String(nvRow.MaNV), String(nvRow.HoTen)),
        chucDanh: resolveChucDanh(String(nvRow.MaNV), nvRow.ChucDanh != null ? String(nvRow.ChucDanh) : null),
        maBoPhan: nvRow.MaBoPhan != null ? String(nvRow.MaBoPhan) : null,
        tenBoPhan: fixTenBoPhan(
          nvRow.MaBoPhan != null ? String(nvRow.MaBoPhan) : null,
          nvRow.TenBoPhan != null ? String(nvRow.TenBoPhan) : null,
        ),
      }
    : null;

  const items = itemRows.map((row) => {
    const maHang = String(row.MaHang);
    return {
      maHang,
      tenSanPham: resolveTenSanPham(maHang, String(row.TenSanPham)),
      donViTinh: resolveDonViTinh(maHang, String(row.DonViTinh)),
      soLuongConLai: toNumber(row.SoLuongConLai),
      ngayCapDau:
        row.NgayCapDau instanceof Date
          ? row.NgayCapDau.toISOString().slice(0, 10)
          : row.NgayCapDau != null
            ? String(row.NgayCapDau).slice(0, 10)
            : null,
    };
  });

  return { nhanVien, items };
}

export async function fetchAuditHistory(params?: {
  bangDuLieu?: string | null;
  maBanGhi?: string | null;
  q?: string | null;
  limit?: number;
}): Promise<AuditLogGroup[]> {
  return fetchAuditLogGroups(params);
}
