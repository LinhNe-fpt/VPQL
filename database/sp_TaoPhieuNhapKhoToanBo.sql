USE VPP;
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuNhapKhoToanBo
    @SoPhieu VARCHAR(50),
    @NguoiLap NVARCHAR(100),
    @GhiChu NVARCHAR(500),
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;

    DECLARE @DongHangNhap TABLE (
        MaHang VARCHAR(50),
        SoLuong DECIMAL(18,2),
        DonGiaNhap DECIMAL(18,2)
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO @DongHangNhap (MaHang, SoLuong, DonGiaNhap)
        SELECT
            MaHang,
            SoLuong,
            DonGia
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong',
            DonGia DECIMAL(18,2) '$.DonGia'
        );

        IF EXISTS (
            SELECT 1 FROM @DongHangNhap d
            LEFT JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE v.MaHang IS NULL
        )
        BEGIN
            DECLARE @MaHangLoi VARCHAR(50);
            SELECT TOP 1 @MaHangLoi = d.MaHang
            FROM @DongHangNhap d
            LEFT JOIN DanhMucVatTu v ON d.MaHang = v.MaHang
            WHERE v.MaHang IS NULL;

            RAISERROR(N'Mã hàng [%s] không tồn tại trong danh mục hệ thống. Không thể nhập kho!', 16, 1, @MaHangLoi);
        END

        IF EXISTS (SELECT 1 FROM @DongHangNhap WHERE SoLuong <= 0)
        BEGIN
            RAISERROR(N'Số lượng nhập phải lớn hơn 0.', 16, 1);
        END

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, GhiChu, BoPhanNhanID, NhanVienNhanID)
        VALUES (@SoPhieu, 'NHAP', GETDATE(), @NguoiLap, @GhiChu, NULL, NULL);

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT @IdPhieuInserted, MaHang, SoLuong, DonGiaNhap, N'Nhập kho bổ sung số lượng'
        FROM @DongHangNhap;

        MERGE TonKhoHienTai AS target
        USING @DongHangNhap AS source
        ON (target.MaHang = source.MaHang)
        WHEN MATCHED THEN
            UPDATE SET
                target.SoLuongTon = target.SoLuongTon + source.SoLuong,
                target.NgayCapNhatCuoi = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (MaHang, SoLuongTon, NgayCapNhatCuoi)
            VALUES (source.MaHang, source.SoLuong, GETDATE());

        INSERT INTO LichSuBienDong (MaHang, PhieuID, LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, NgayGio)
        SELECT
            dn.MaHang,
            @IdPhieuInserted,
            'TANG',
            dn.SoLuong,
            tk.SoLuongTon,
            GETDATE()
        FROM @DongHangNhap dn
        INNER JOIN TonKhoHienTai tk ON dn.MaHang = tk.MaHang;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
