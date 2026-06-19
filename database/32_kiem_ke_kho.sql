USE VPP;
GO

-- Kiểm kê kho: điều chỉnh tồn theo số lượng thực tế, ghi LichSuBienDong

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_LichSuBienDong_MaHang_NgayGio'
      AND object_id = OBJECT_ID('LichSuBienDong')
)
BEGIN
    CREATE INDEX IX_LichSuBienDong_MaHang_NgayGio
        ON LichSuBienDong (MaHang, NgayGio DESC)
        INCLUDE (LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, PhieuID);
END
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuKiemKeToanBo
    @SoPhieu VARCHAR(50),
    @NguoiLap NVARCHAR(100),
    @GhiChu NVARCHAR(500) = NULL,
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;
    DECLARE @MaHangLoi VARCHAR(50);
    DECLARE @ErrorMessage NVARCHAR(4000);

    DECLARE @DongKiemKe TABLE (
        MaHang VARCHAR(50),
        SoLuongHeThong DECIMAL(18, 2),
        SoLuongThucTe DECIMAL(18, 2),
        ChenhLech DECIMAL(18, 2),
        DonGia DECIMAL(18, 2),
        GhiChuDong NVARCHAR(255)
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO @DongKiemKe (MaHang, SoLuongHeThong, SoLuongThucTe, ChenhLech, DonGia, GhiChuDong)
        SELECT
            src.MaHang,
            ISNULL(tk.SoLuongTon, 0),
            src.SoLuongThucTe,
            src.SoLuongThucTe - ISNULL(tk.SoLuongTon, 0),
            v.DonGia,
            COALESCE(NULLIF(LTRIM(RTRIM(src.GhiChu)), N''), N'Kiểm kê kho')
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuongThucTe DECIMAL(18, 2) '$.SoLuongThucTe',
            GhiChu NVARCHAR(255) '$.GhiChu'
        ) src
        INNER JOIN DanhMucVatTu v ON v.MaHang = src.MaHang
        LEFT JOIN TonKhoHienTai tk ON tk.MaHang = src.MaHang;

        IF EXISTS (
            SELECT 1 FROM OPENJSON(@DanhSachHangJson)
            WITH (MaHang VARCHAR(50) '$.MaHang') src
            LEFT JOIN DanhMucVatTu v ON v.MaHang = src.MaHang
            WHERE v.MaHang IS NULL
        )
        BEGIN
            SELECT TOP 1 @MaHangLoi = src.MaHang
            FROM OPENJSON(@DanhSachHangJson)
            WITH (MaHang VARCHAR(50) '$.MaHang') src
            LEFT JOIN DanhMucVatTu v ON v.MaHang = src.MaHang
            WHERE v.MaHang IS NULL;
            RAISERROR(N'Mã hàng [%s] không tồn tại trong danh mục!', 16, 1, @MaHangLoi);
        END

        IF EXISTS (SELECT 1 FROM @DongKiemKe WHERE SoLuongThucTe < 0)
            RAISERROR(N'Số lượng thực tế không được âm.', 16, 1);

        IF NOT EXISTS (SELECT 1 FROM @DongKiemKe WHERE ChenhLech <> 0)
            RAISERROR(N'Không có chênh lệch kiểm kê — không tạo phiếu điều chỉnh.', 16, 1);

        INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, GhiChu, BoPhanNhanID, NhanVienNhanID)
        VALUES (@SoPhieu, 'KIEM_KE', GETDATE(), @NguoiLap, @GhiChu, NULL, NULL);

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT
            @IdPhieuInserted,
            d.MaHang,
            ABS(d.ChenhLech),
            d.DonGia,
            d.GhiChuDong + N' · HT ' + CAST(d.SoLuongHeThong AS NVARCHAR(24))
                + N' → TT ' + CAST(d.SoLuongThucTe AS NVARCHAR(24))
        FROM @DongKiemKe d
        WHERE d.ChenhLech <> 0;

        MERGE TonKhoHienTai AS target
        USING (SELECT MaHang, SoLuongThucTe FROM @DongKiemKe WHERE ChenhLech <> 0) AS source
        ON target.MaHang = source.MaHang
        WHEN MATCHED THEN
            UPDATE SET
                target.SoLuongTon = source.SoLuongThucTe,
                target.NgayCapNhatCuoi = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (MaHang, SoLuongTon, NgayCapNhatCuoi)
            VALUES (source.MaHang, source.SoLuongThucTe, GETDATE());

        INSERT INTO LichSuBienDong (MaHang, PhieuID, LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, NgayGio)
        SELECT
            d.MaHang,
            @IdPhieuInserted,
            CASE WHEN d.ChenhLech > 0 THEN 'TANG' ELSE 'GIAM' END,
            ABS(d.ChenhLech),
            d.SoLuongThucTe,
            GETDATE()
        FROM @DongKiemKe d
        WHERE d.ChenhLech <> 0;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @ErrorMessage = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
