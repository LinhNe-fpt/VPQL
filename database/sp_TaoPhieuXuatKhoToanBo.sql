USE VPP;
GO

-- Canonical source: database/07_sp_TaoPhieuXuatKhoToanBo.sql
-- Chặn định mức ròng (XUAT_CN − THU_HOI) + kiểm tra tồn kho, một transaction JSON.

CREATE OR ALTER PROCEDURE sp_TaoPhieuXuatKhoToanBo
    @SoPhieu VARCHAR(50),
    @LoaiPhieu VARCHAR(20),
    @NguoiLap NVARCHAR(100),
    @MaBoPhan VARCHAR(50) = NULL,
    @MaNV VARCHAR(50) = NULL,
    @GhiChu NVARCHAR(500),
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;
    DECLARE @BoPhanID INT = NULL;
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
        INSERT INTO @DongHangXuat (MaHang, SoLuong)
        SELECT MaHang, SoLuong
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong'
        );

        IF @MaBoPhan IS NOT NULL
            SELECT @BoPhanID = ID FROM DanhMucBoPhan WHERE MaBoPhan = @MaBoPhan;

        IF @MaNV IS NOT NULL
            SELECT @NhanVienID = ID, @ChucDanhNhanVien = ChucDanh
            FROM DanhMucNhanVien
            WHERE MaNV = @MaNV;

        IF EXISTS (SELECT 1 FROM @DongHangXuat WHERE SoLuong <= 0)
        BEGIN
            RAISERROR(N'Số lượng xuất của tất cả mặt hàng phải lớn hơn 0!', 16, 1);
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

            RAISERROR(N'Mã hàng [%s] không tồn tại trong danh mục hệ thống!', 16, 1, @MaHangLoi);
        END

        IF @LoaiPhieu = 'XUAT_CN'
        BEGIN
            IF @NhanVienID IS NULL
            BEGIN
                RAISERROR(N'Phiếu xuất cá nhân cần mã nhân viên hợp lệ.', 16, 1);
            END

            IF EXISTS (
                SELECT 1
                FROM @DongHangXuat src
                INNER JOIN DinhMucCapPhat dm ON dm.ChucDanh = @ChucDanhNhanVien AND dm.MaHang = src.MaHang
                OUTER APPLY (
                    SELECT
                        CASE
                            WHEN ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END), 0)
                               - ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END), 0) < 0 THEN 0
                            ELSE ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END), 0)
                               - ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END), 0)
                        END AS DaDungThucTe
                    FROM ChiTietGiaoDich ct
                    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
                    WHERE p.NhanVienNhanID = @NhanVienID
                      AND ct.MaHang = src.MaHang
                      AND MONTH(p.NgayLap) = MONTH(GETDATE())
                      AND YEAR(p.NgayLap) = YEAR(GETDATE())
                ) current_month
                WHERE (ISNULL(current_month.DaDungThucTe, 0) + src.SoLuong) > dm.SoLuongToiDa
            )
            BEGIN
                SELECT TOP 1 @VatTuViPham = v.TenSanPham
                FROM @DongHangXuat src
                INNER JOIN DinhMucCapPhat dm ON dm.ChucDanh = @ChucDanhNhanVien AND dm.MaHang = src.MaHang
                INNER JOIN DanhMucVatTu v ON src.MaHang = v.MaHang
                OUTER APPLY (
                    SELECT
                        CASE
                            WHEN ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END), 0)
                               - ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END), 0) < 0 THEN 0
                            ELSE ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END), 0)
                               - ISNULL(SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END), 0)
                        END AS DaDungThucTe
                    FROM ChiTietGiaoDich ct
                    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
                    WHERE p.NhanVienNhanID = @NhanVienID
                      AND ct.MaHang = src.MaHang
                      AND MONTH(p.NgayLap) = MONTH(GETDATE())
                      AND YEAR(p.NgayLap) = YEAR(GETDATE())
                ) current_month
                WHERE (ISNULL(current_month.DaDungThucTe, 0) + src.SoLuong) > dm.SoLuongToiDa;

                RAISERROR(
                    N'Chặn cấp phát! Vật tư [%s] vượt quá định mức ròng còn lại trong tháng (đã trừ lượng thu hồi).',
                    16,
                    1,
                    @VatTuViPham
                );
            END
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

            RAISERROR(N'Không đủ tồn kho để xuất! Mặt hàng [%s] không đủ số lượng trong kho tổng.', 16, 1, @VatTuHetHang);
        END

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, BoPhanNhanID, NhanVienNhanID, GhiChu)
        VALUES (@SoPhieu, @LoaiPhieu, GETDATE(), @NguoiLap, @BoPhanID, @NhanVienID, @GhiChu);

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT @IdPhieuInserted, src.MaHang, src.SoLuong, v.DonGia, N'Xuất kho cấp phát vật tư'
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
