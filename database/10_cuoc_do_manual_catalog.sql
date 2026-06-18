USE VPP;
GO

-- Người nhận nhập tay + danh mục cược đồ đầy đủ (size S–5XL)

IF COL_LENGTH('PhieuGiaoDich', 'TenNguoiNhan') IS NULL
    ALTER TABLE PhieuGiaoDich ADD TenNguoiNhan NVARCHAR(255) NULL;
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuCuocDoToanBo
    @SoPhieu VARCHAR(50),
    @LoaiPhieu VARCHAR(20),
    @NguoiLap NVARCHAR(100),
    @HoTenNguoiNhan NVARCHAR(255),
    @MaNV VARCHAR(50) = NULL,
    @GhiChu NVARCHAR(500) = NULL,
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;
    DECLARE @NhanVienID INT = NULL;
    DECLARE @ChucDanhNhanVien NVARCHAR(100) = NULL;
    DECLARE @VatTuViPham NVARCHAR(200);
    DECLARE @VatTuHetHang NVARCHAR(200);
    DECLARE @MaHangLoi VARCHAR(50);
    DECLARE @ErrorMessage NVARCHAR(4000);

    DECLARE @DongHangXuat TABLE (
        MaHang VARCHAR(50),
        SoLuong DECIMAL(18,2)
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @LoaiPhieu NOT IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN')
            RAISERROR(N'Loại phiếu cược đồ không hợp lệ.', 16, 1);

        IF @HoTenNguoiNhan IS NULL OR LTRIM(RTRIM(@HoTenNguoiNhan)) = ''
            RAISERROR(N'Vui lòng nhập họ tên người nhận.', 16, 1);

        INSERT INTO @DongHangXuat (MaHang, SoLuong)
        SELECT MaHang, SoLuong
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong'
        );

        IF @MaNV IS NOT NULL AND LTRIM(RTRIM(@MaNV)) <> ''
            SELECT @NhanVienID = ID, @ChucDanhNhanVien = ChucDanh
            FROM DanhMucNhanVien
            WHERE MaNV = LTRIM(RTRIM(@MaNV));

        IF @NhanVienID IS NOT NULL
        BEGIN
            IF @LoaiPhieu = 'XUAT_CUOC_CN'
               AND NOT (
                   @ChucDanhNhanVien LIKE N'%công nhân%'
                   OR @ChucDanhNhanVien LIKE N'%Công nhân%'
                   OR @ChucDanhNhanVien LIKE N'%sản xuất%'
                   OR @ChucDanhNhanVien LIKE N'%Sản xuất%'
               )
                RAISERROR(N'Phiếu công nhân: mã NV không khớp chức danh công nhân / sản xuất.', 16, 1);

            IF @LoaiPhieu = 'XUAT_CUOC_NV'
               AND (
                   @ChucDanhNhanVien LIKE N'%công nhân%'
                   OR @ChucDanhNhanVien LIKE N'%Công nhân%'
                   OR @ChucDanhNhanVien LIKE N'%sản xuất%'
                   OR @ChucDanhNhanVien LIKE N'%Sản xuất%'
               )
                RAISERROR(N'Phiếu nhân viên: mã NV không khớp chức danh nhân viên.', 16, 1);
        END

        IF EXISTS (SELECT 1 FROM @DongHangXuat WHERE SoLuong <= 0)
            RAISERROR(N'Số lượng cấp phát phải lớn hơn 0!', 16, 1);

        IF EXISTS (
            SELECT 1 FROM @DongHangXuat d
            LEFT JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE v.MaHang IS NULL
        )
        BEGIN
            SELECT TOP 1 @MaHangLoi = d.MaHang
            FROM @DongHangXuat d
            LEFT JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE v.MaHang IS NULL;
            RAISERROR(N'Mã hàng [%s] không tồn tại trong danh mục!', 16, 1, @MaHangLoi);
        END

        IF EXISTS (
            SELECT 1 FROM @DongHangXuat d
            INNER JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE v.MaHang NOT LIKE 'CD-%'
        )
            RAISERROR(N'Phiếu cược đồ chỉ được cấp hàng thuộc nhóm Cược đồ.', 16, 1);

        IF @NhanVienID IS NOT NULL
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM @DongHangXuat src
                INNER JOIN DinhMucCapPhat dm ON dm.ChucDanh = @ChucDanhNhanVien AND dm.MaHang = src.MaHang
                OUTER APPLY (
                    SELECT ISNULL(SUM(ct.SoLuong), 0) AS DaCapNam
                    FROM ChiTietGiaoDich ct
                    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
                    WHERE p.NhanVienNhanID = @NhanVienID
                      AND ct.MaHang = src.MaHang
                      AND p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN')
                      AND YEAR(p.NgayLap) = YEAR(GETDATE())
                ) current_year
                WHERE (ISNULL(current_year.DaCapNam, 0) + src.SoLuong) > dm.SoLuongToiDa
            )
            BEGIN
                SELECT TOP 1 @VatTuViPham = v.TenSanPham
                FROM @DongHangXuat src
                INNER JOIN DinhMucCapPhat dm ON dm.ChucDanh = @ChucDanhNhanVien AND dm.MaHang = src.MaHang
                INNER JOIN DanhMucVatTu v ON src.MaHang = v.MaHang
                OUTER APPLY (
                    SELECT ISNULL(SUM(ct.SoLuong), 0) AS DaCapNam
                    FROM ChiTietGiaoDich ct
                    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
                    WHERE p.NhanVienNhanID = @NhanVienID
                      AND ct.MaHang = src.MaHang
                      AND p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN')
                      AND YEAR(p.NgayLap) = YEAR(GETDATE())
                ) current_year
                WHERE (ISNULL(current_year.DaCapNam, 0) + src.SoLuong) > dm.SoLuongToiDa;

                RAISERROR(N'Vượt định mức cược đồ năm! [%s]', 16, 1, @VatTuViPham);
            END
        END

        IF EXISTS (
            SELECT 1 FROM @DongHangXuat src
            LEFT JOIN TonKhoHienTai tk ON src.MaHang = tk.MaHang
            WHERE src.SoLuong > ISNULL(tk.SoLuongTon, 0)
        )
        BEGIN
            SELECT TOP 1 @VatTuHetHang = v.TenSanPham
            FROM @DongHangXuat src
            LEFT JOIN TonKhoHienTai tk ON src.MaHang = tk.MaHang
            INNER JOIN DanhMucVatTu v ON src.MaHang = v.MaHang
            WHERE src.SoLuong > ISNULL(tk.SoLuongTon, 0);
            RAISERROR(N'Không đủ tồn kho! [%s]', 16, 1, @VatTuHetHang);
        END

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, BoPhanNhanID, NhanVienNhanID, TenNguoiNhan, GhiChu)
        VALUES (@SoPhieu, @LoaiPhieu, GETDATE(), @NguoiLap, NULL, @NhanVienID, LTRIM(RTRIM(@HoTenNguoiNhan)), @GhiChu);

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT @IdPhieuInserted, src.MaHang, src.SoLuong, v.DonGia, N'Cấp cược đồ'
        FROM @DongHangXuat src
        INNER JOIN DanhMucVatTu v ON src.MaHang = v.MaHang;

        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon - src.SoLuong,
            tk.NgayCapNhatCuoi = GETDATE()
        FROM TonKhoHienTai tk
        INNER JOIN @DongHangXuat src ON tk.MaHang = src.MaHang;

        INSERT INTO LichSuBienDong (MaHang, PhieuID, LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, NgayGio)
        SELECT xh.MaHang, @IdPhieuInserted, 'GIAM', xh.SoLuong, tk.SoLuongTon, GETDATE()
        FROM @DongHangXuat xh
        INNER JOIN TonKhoHienTai tk ON xh.MaHang = tk.MaHang;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- Danh mục hàng cược đồ
DECLARE @HangMuc TABLE (
    MaPrefix VARCHAR(20),
    Ten NVARCHAR(120),
    DonGia DECIMAL(18,2),
    CoSize BIT
);

INSERT INTO @HangMuc (MaPrefix, Ten, DonGia, CoSize) VALUES
    ('CD-DP',  N'Áo đồng phục',              280000, 1),
    ('CD-GILE', N'Áo gile',                   320000, 1),
    ('CD-DTD', N'Dép tĩnh điện',             120000, 0),
    ('CD-THE', N'Thẻ nhân viên',             50000,  0),
    ('CD-ABH', N'Áo bảo hộ',                 320000, 1);

DECLARE @Sizes TABLE (SizeCode VARCHAR(5), SortOrder INT);
INSERT INTO @Sizes VALUES
    ('S', 1), ('M', 2), ('L', 3), ('XL', 4),
    ('2XL', 5), ('3XL', 6), ('4XL', 7), ('5XL', 8);

INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
SELECT
    CASE WHEN h.CoSize = 1 THEN h.MaPrefix + '-' + s.SizeCode ELSE h.MaPrefix END,
    CASE WHEN h.CoSize = 1 THEN h.Ten + N' size ' + s.SizeCode ELSE h.Ten END,
    CASE WHEN h.MaPrefix = 'CD-THE' THEN N'Cái' WHEN h.MaPrefix = 'CD-DTD' THEN N'Đôi' ELSE N'Bộ' END,
    N'Cược đồ',
    h.DonGia,
    3
FROM @HangMuc h
CROSS JOIN @Sizes s
WHERE h.CoSize = 1
  AND NOT EXISTS (
      SELECT 1 FROM DanhMucVatTu v
      WHERE v.MaHang = h.MaPrefix + '-' + s.SizeCode
  );

INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
SELECT h.MaPrefix, h.Ten, N'Đôi', N'Cược đồ', h.DonGia, 5
FROM @HangMuc h
WHERE h.CoSize = 0
  AND NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = h.MaPrefix);

INSERT INTO TonKhoHienTai (MaHang, SoLuongTon, NgayCapNhatCuoi)
SELECT v.MaHang, 40, GETDATE()
FROM DanhMucVatTu v
WHERE v.NhomHang = N'Cược đồ'
  AND NOT EXISTS (SELECT 1 FROM TonKhoHienTai t WHERE t.MaHang = v.MaHang);
GO
