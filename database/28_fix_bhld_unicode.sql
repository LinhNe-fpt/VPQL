USE VPP;
GO

-- Chuỗi tiếng Việt an toàn (không phụ thuộc encoding file .sql khi chạy sqlcmd)

DECLARE @BhldTag NVARCHAR(50) =
    NCHAR(0x0111) + NCHAR(0x1ED3) + N' tr' + NCHAR(0x1EA3) + N' l' + NCHAR(0x1EA1) + N'i';

DECLARE @BhldGhiChu NVARCHAR(200) =
    N'Thu h' + NCHAR(0x1ED3) + N'i v' + NCHAR(0x00EA)
    + N' kho ' + NCHAR(0x00B7) + N' ' + @BhldTag;

UPDATE ct
SET
    ct.TrangThaiHang = @BhldTag,
    ct.GhiChuDong = @BhldGhiChu
FROM ChiTietGiaoDich ct
INNER JOIN PhieuGiaoDich p ON p.ID = ct.PhieuID
WHERE p.LoaiPhieu = 'THU_HOI_BHLD';
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuThuHoiBhld
    @SoPhieu VARCHAR(50),
    @NguoiLap NVARCHAR(100),
    @MaNV VARCHAR(50) = NULL,
    @MaBoPhan VARCHAR(50) = NULL,
    @HoTenNguoiTra NVARCHAR(255) = NULL,
    @GhiChu NVARCHAR(500) = NULL,
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;
    DECLARE @NhanVienID INT = NULL;
    DECLARE @BoPhanID INT = NULL;
    DECLARE @BhldTag NVARCHAR(50) =
        NCHAR(0x0111) + NCHAR(0x1ED3) + N' tr' + NCHAR(0x1EA3) + N' l' + NCHAR(0x1EA1) + N'i';
    DECLARE @BhldGhiChu NVARCHAR(200) =
        N'Thu h' + NCHAR(0x1ED3) + N'i v' + NCHAR(0x00EA)
        + N' kho ' + NCHAR(0x00B7) + N' ' + @BhldTag;

    DECLARE @DongHang TABLE (
        MaHang VARCHAR(50),
        SoLuong DECIMAL(18,2),
        DonGia DECIMAL(18,2)
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        IF @MaNV IS NULL OR LTRIM(RTRIM(@MaNV)) = ''
            RAISERROR(N'Phiếu thu hồi cần mã nhân viên trả đồ.', 16, 1);

        IF @HoTenNguoiTra IS NULL OR LTRIM(RTRIM(@HoTenNguoiTra)) = ''
            RAISERROR(N'Phiếu thu hồi cần họ tên nhân viên trả đồ.', 16, 1);

        SELECT @NhanVienID = nv.ID, @BoPhanID = nv.BoPhanID
        FROM DanhMucNhanVien nv
        WHERE nv.MaNV = LTRIM(RTRIM(@MaNV));

        IF @MaBoPhan IS NOT NULL AND LTRIM(RTRIM(@MaBoPhan)) <> ''
        BEGIN
            SELECT @BoPhanID = ID
            FROM DanhMucBoPhan
            WHERE MaBoPhan = LTRIM(RTRIM(@MaBoPhan));

            IF @BoPhanID IS NULL
                RAISERROR(N'Mã bộ phận không hợp lệ.', 16, 1);
        END

        INSERT INTO @DongHang (MaHang, SoLuong, DonGia)
        SELECT j.MaHang, j.SoLuong, ISNULL(j.DonGia, v.DonGia)
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong',
            DonGia DECIMAL(18,2) '$.DonGia'
        ) j
        INNER JOIN DanhMucVatTu v ON j.MaHang = v.MaHang;

        IF (SELECT COUNT(*) FROM OPENJSON(@DanhSachHangJson)) <> (SELECT COUNT(*) FROM @DongHang)
            RAISERROR(N'Có mã hàng không tồn tại trong danh mục kho.', 16, 1);

        IF NOT EXISTS (SELECT 1 FROM @DongHang)
            RAISERROR(N'Phiếu cần ít nhất một dòng hàng.', 16, 1);

        IF EXISTS (SELECT 1 FROM @DongHang WHERE SoLuong <= 0)
            RAISERROR(N'Số lượng thu hồi phải lớn hơn 0.', 16, 1);

        IF EXISTS (SELECT 1 FROM @DongHang WHERE MaHang NOT LIKE 'CD-%')
            RAISERROR(N'Thu hồi chỉ nhận hàng đồng phục trong kho (mã CD-*).', 16, 1);

        INSERT INTO PhieuGiaoDich (
            SoPhieu, LoaiPhieu, NgayLap, NguoiLap,
            BoPhanNhanID, NhanVienNhanID, TenNguoiNhan, GhiChu
        )
        VALUES (
            @SoPhieu, 'THU_HOI_BHLD', GETDATE(), @NguoiLap,
            @BoPhanID, @NhanVienID,
            LTRIM(RTRIM(@HoTenNguoiTra)),
            @GhiChu
        );

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (
            PhieuID, MaHang, SoLuong, DonGia, GhiChuDong,
            NgayCap, NgayThuHoi, SoThangSuDung, TrangThaiHang
        )
        SELECT
            @IdPhieuInserted,
            d.MaHang,
            d.SoLuong,
            d.DonGia,
            @BhldGhiChu,
            NULL,
            CAST(GETDATE() AS DATE),
            NULL,
            @BhldTag
        FROM @DongHang d;

        MERGE TonKhoHienTai AS target
        USING (
            SELECT MaHang, SUM(SoLuong) AS TongThuHoi
            FROM @DongHang
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
            d.MaHang,
            @IdPhieuInserted,
            'TANG',
            d.SoLuong,
            tk.SoLuongTon,
            GETDATE()
        FROM @DongHang d
        INNER JOIN TonKhoHienTai tk ON d.MaHang = tk.MaHang;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO
