USE VPP;
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuThuHoiKho
    @SoPhieu VARCHAR(50),
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

    DECLARE @DongHangThuHoi TABLE (
        MaHang VARCHAR(50),
        SoLuong DECIMAL(18,2),
        DonGiaThuHoi DECIMAL(18,2)
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @MaBoPhan IS NOT NULL
            SELECT @BoPhanID = ID FROM DanhMucBoPhan WHERE MaBoPhan = @MaBoPhan;

        IF @MaNV IS NOT NULL
            SELECT @NhanVienID = ID FROM DanhMucNhanVien WHERE MaNV = @MaNV;

        INSERT INTO @DongHangThuHoi (MaHang, SoLuong, DonGiaThuHoi)
        SELECT
            j.MaHang,
            j.SoLuong,
            v.DonGia
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong'
        ) j
        INNER JOIN DanhMucVatTu v ON j.MaHang = v.MaHang;

        IF (SELECT COUNT(*) FROM OPENJSON(@DanhSachHangJson)) <> (SELECT COUNT(*) FROM @DongHangThuHoi)
        BEGIN
            RAISERROR(N'Có chứa mã hàng không tồn tại trong danh mục hệ thống!', 16, 1);
        END

        IF EXISTS (SELECT 1 FROM @DongHangThuHoi WHERE SoLuong <= 0)
        BEGIN
            RAISERROR(N'Số lượng thu hồi của vật tư phải lớn hơn 0!', 16, 1);
        END

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, BoPhanNhanID, NhanVienNhanID, GhiChu)
        VALUES (@SoPhieu, 'THU_HOI', GETDATE(), @NguoiLap, @BoPhanID, @NhanVienID, @GhiChu);

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT @IdPhieuInserted, MaHang, SoLuong, DonGiaThuHoi, N'Thu hồi vật tư hoàn kho'
        FROM @DongHangThuHoi;

        MERGE TonKhoHienTai AS target
        USING (
            SELECT MaHang, SUM(SoLuong) AS TongThuHoi
            FROM @DongHangThuHoi
            GROUP BY MaHang
        ) AS source
        ON (target.MaHang = source.MaHang)
        WHEN MATCHED THEN
            UPDATE SET
                target.SoLuongTon = target.SoLuongTon + source.TongThuHoi,
                target.NgayCapNhatCuoi = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (MaHang, SoLuongTon, NgayCapNhatCuoi)
            VALUES (source.MaHang, source.TongThuHoi, GETDATE());

        INSERT INTO LichSuBienDong (MaHang, PhieuID, LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, NgayGio)
        SELECT
            th.MaHang,
            @IdPhieuInserted,
            'TANG',
            th.SoLuong,
            tk.SoLuongTon,
            GETDATE()
        FROM @DongHangThuHoi th
        INNER JOIN TonKhoHienTai tk ON th.MaHang = tk.MaHang;

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
