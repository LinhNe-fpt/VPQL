USE VPP;
GO

-- Phiếu cược đồ: XUAT_CUOC_NV (nhân viên) · XUAT_CUOC_CN (công nhân)
-- Hàng thuộc NhomHang = N'Cược đồ', định mức theo năm (DinhMucCapPhat).

CREATE OR ALTER VIEW v_TienDoCuocDoNhanVien AS
SELECT
    nv.ID AS NhanVienID,
    nv.MaNV,
    nv.HoTen,
    nv.ChucDanh,
    dm.MaHang,
    v.TenSanPham,
    v.DonViTinh,
    dm.SoLuongToiDa,
    ISNULL(calc.TongCap, 0) AS DaDung,
    CASE
        WHEN (dm.SoLuongToiDa - ISNULL(calc.TongCap, 0)) < 0 THEN 0
        ELSE (dm.SoLuongToiDa - ISNULL(calc.TongCap, 0))
    END AS ConLai,
    CASE
        WHEN dm.SoLuongToiDa > 0 THEN
            CASE
                WHEN (ISNULL(calc.TongCap, 0) / dm.SoLuongToiDa) * 100 < 0 THEN 0
                ELSE (ISNULL(calc.TongCap, 0) / dm.SoLuongToiDa) * 100
            END
        ELSE 0
    END AS PhanTramDaDung
FROM DanhMucNhanVien nv
INNER JOIN DinhMucCapPhat dm ON nv.ChucDanh = dm.ChucDanh
INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang AND v.NhomHang = N'Cược đồ'
OUTER APPLY (
    SELECT SUM(ct.SoLuong) AS TongCap
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.NhanVienNhanID = nv.ID
      AND ct.MaHang = dm.MaHang
      AND p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN')
      AND YEAR(p.NgayLap) = YEAR(GETDATE())
) calc;
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuCuocDoToanBo
    @SoPhieu VARCHAR(50),
    @LoaiPhieu VARCHAR(20),
    @NguoiLap NVARCHAR(100),
    @MaNV VARCHAR(50),
    @GhiChu NVARCHAR(500),
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
        BEGIN
            RAISERROR(N'Loại phiếu cược đồ không hợp lệ.', 16, 1);
        END

        INSERT INTO @DongHangXuat (MaHang, SoLuong)
        SELECT MaHang, SoLuong
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong'
        );

        SELECT @NhanVienID = ID, @ChucDanhNhanVien = ChucDanh
        FROM DanhMucNhanVien
        WHERE MaNV = @MaNV;

        IF @NhanVienID IS NULL
        BEGIN
            RAISERROR(N'Phiếu cược đồ cần mã nhân viên / công nhân hợp lệ.', 16, 1);
        END

        IF @LoaiPhieu = 'XUAT_CUOC_CN'
           AND NOT (
               @ChucDanhNhanVien LIKE N'%công nhân%'
               OR @ChucDanhNhanVien LIKE N'%Công nhân%'
               OR @ChucDanhNhanVien LIKE N'%sản xuất%'
               OR @ChucDanhNhanVien LIKE N'%Sản xuất%'
           )
        BEGIN
            RAISERROR(N'Phiếu công nhân chỉ cấp cho người có chức danh công nhân / sản xuất.', 16, 1);
        END

        IF @LoaiPhieu = 'XUAT_CUOC_NV'
           AND (
               @ChucDanhNhanVien LIKE N'%công nhân%'
               OR @ChucDanhNhanVien LIKE N'%Công nhân%'
               OR @ChucDanhNhanVien LIKE N'%sản xuất%'
               OR @ChucDanhNhanVien LIKE N'%Sản xuất%'
           )
        BEGIN
            RAISERROR(N'Phiếu nhân viên không cấp cho chức danh công nhân / sản xuất.', 16, 1);
        END

        IF EXISTS (SELECT 1 FROM @DongHangXuat WHERE SoLuong <= 0)
        BEGIN
            RAISERROR(N'Số lượng cấp phát phải lớn hơn 0!', 16, 1);
        END

        IF EXISTS (
            SELECT 1
            FROM @DongHangXuat d
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
            SELECT 1
            FROM @DongHangXuat d
            INNER JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE ISNULL(v.NhomHang, N'') <> N'Cược đồ'
        )
        BEGIN
            RAISERROR(N'Phiếu cược đồ chỉ được cấp hàng thuộc nhóm Cược đồ.', 16, 1);
        END

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

            RAISERROR(
                N'Vượt định mức cược đồ năm! [%s] vượt hạn mức còn lại.',
                16,
                1,
                @VatTuViPham
            );
        END

        IF EXISTS (
            SELECT 1
            FROM @DongHangXuat src
            LEFT JOIN TonKhoHienTai tk ON src.MaHang = tk.MaHang
            WHERE src.SoLuong > ISNULL(tk.SoLuongTon, 0)
        )
        BEGIN
            SELECT TOP 1 @VatTuHetHang = v.TenSanPham
            FROM @DongHangXuat src
            LEFT JOIN TonKhoHienTai tk ON src.MaHang = tk.MaHang
            INNER JOIN DanhMucVatTu v ON src.MaHang = v.MaHang
            WHERE src.SoLuong > ISNULL(tk.SoLuongTon, 0);

            RAISERROR(N'Không đủ tồn kho! [%s] không đủ số lượng.', 16, 1, @VatTuHetHang);
        END

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, BoPhanNhanID, NhanVienNhanID, GhiChu)
        VALUES (@SoPhieu, @LoaiPhieu, GETDATE(), @NguoiLap, NULL, @NhanVienID, @GhiChu);

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
        SELECT
            xh.MaHang,
            @IdPhieuInserted,
            'GIAM',
            xh.SoLuong,
            tk.SoLuongTon,
            GETDATE()
        FROM @DongHangXuat xh
        INNER JOIN TonKhoHienTai tk ON xh.MaHang = tk.MaHang;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ErrorMessage = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- Mẫu hàng cược đồ (chạy an toàn nhiều lần)
IF NOT EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'CD-AO-NV-M')
BEGIN
    INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
    VALUES
        ('CD-AO-NV-M', N'Áo cược đồ nhân viên nam M', N'Bộ', N'Cược đồ', 280000, 5),
        ('CD-AO-CN-L', N'Áo cược đồ công nhân L', N'Bộ', N'Cược đồ', 220000, 10),
        ('CD-GIAY-CN-42', N'Giày bảo hộ công nhân 42', N'Đôi', N'Cược đồ', 350000, 8);
END

IF NOT EXISTS (SELECT 1 FROM TonKhoHienTai WHERE MaHang = 'CD-AO-NV-M')
BEGIN
    INSERT INTO TonKhoHienTai (MaHang, SoLuongTon, NgayCapNhatCuoi)
    SELECT MaHang, 50, GETDATE() FROM DanhMucVatTu WHERE MaHang IN ('CD-AO-NV-M', 'CD-AO-CN-L', 'CD-GIAY-CN-42');
END

IF NOT EXISTS (SELECT 1 FROM DinhMucCapPhat WHERE MaHang = 'CD-AO-NV-M' AND ChucDanh = N'Nhân viên văn phòng')
BEGIN
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES
        (N'Nhân viên văn phòng', 'CD-AO-NV-M', 2, N'Định mức cược đồ / năm'),
        (N'Công nhân sản xuất', 'CD-AO-CN-L', 2, N'Định mức cược đồ / năm'),
        (N'Công nhân sản xuất', 'CD-GIAY-CN-42', 1, N'Định mức cược đồ / năm');
END
GO
