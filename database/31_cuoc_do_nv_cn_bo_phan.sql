USE VPP;
GO

-- Phiếu NV/CN: bắt buộc chọn bộ phận (thay mã nhân viên trên form)

CREATE OR ALTER PROCEDURE sp_TaoPhieuCuocDoToanBo
    @SoPhieu VARCHAR(50),
    @LoaiPhieu VARCHAR(20),
    @NguoiLap NVARCHAR(100),
    @HoTenNguoiNhan NVARCHAR(255) = NULL,
    @MaNV VARCHAR(50) = NULL,
    @MaBoPhan VARCHAR(50) = NULL,
    @SoNhanVienCap INT = NULL,
    @GhiChu NVARCHAR(500) = NULL,
    @DanhSachHangJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdPhieuInserted INT;
    DECLARE @BoPhanID INT = NULL;
    DECLARE @TenBoPhan NVARCHAR(255) = NULL;
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
        IF @LoaiPhieu NOT IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN', 'XUAT_CUOC_PB')
            RAISERROR(N'Loại phiếu cược đồ không hợp lệ.', 16, 1);

        INSERT INTO @DongHangXuat (MaHang, SoLuong)
        SELECT MaHang, SoLuong
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong'
        );

        IF @LoaiPhieu = 'XUAT_CUOC_PB'
        BEGIN
            IF @MaBoPhan IS NULL OR LTRIM(RTRIM(@MaBoPhan)) = ''
                RAISERROR(N'Phiếu bộ phận cần chọn mã bộ phận.', 16, 1);

            IF @SoNhanVienCap IS NULL OR @SoNhanVienCap <= 0
                RAISERROR(N'Vui lòng nhập số lượng nhân viên cần cấp (> 0).', 16, 1);

            SELECT @BoPhanID = ID, @TenBoPhan = TenBoPhan
            FROM DanhMucBoPhan
            WHERE MaBoPhan = LTRIM(RTRIM(@MaBoPhan));

            IF @BoPhanID IS NULL
                RAISERROR(N'Mã bộ phận không hợp lệ.', 16, 1);

            IF @HoTenNguoiNhan IS NULL OR LTRIM(RTRIM(@HoTenNguoiNhan)) = ''
                SET @HoTenNguoiNhan = @TenBoPhan;
        END
        ELSE
        BEGIN
            IF @HoTenNguoiNhan IS NULL OR LTRIM(RTRIM(@HoTenNguoiNhan)) = ''
                RAISERROR(N'Vui lòng nhập họ tên người nhận.', 16, 1);

            IF @MaBoPhan IS NULL OR LTRIM(RTRIM(@MaBoPhan)) = ''
                RAISERROR(N'Phiếu cần chọn bộ phận.', 16, 1);

            SELECT @BoPhanID = ID, @TenBoPhan = TenBoPhan
            FROM DanhMucBoPhan
            WHERE MaBoPhan = LTRIM(RTRIM(@MaBoPhan));

            IF @BoPhanID IS NULL
                RAISERROR(N'Mã bộ phận không hợp lệ.', 16, 1);

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
        END

        IF EXISTS (SELECT 1 FROM @DongHangXuat WHERE SoLuong <= 0)
            RAISERROR(N'Số lượng cấp phát phải lớn hơn 0!', 16, 1);

        IF @LoaiPhieu = 'XUAT_CUOC_PB'
        BEGIN
            IF EXISTS (
                SELECT 1 FROM @DongHangXuat
                WHERE SoLuong <> @SoNhanVienCap
            )
                RAISERROR(N'Mỗi hạng mục cấp bộ phận phải bằng số nhân viên đã nhập.', 16, 1);
        END

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

        INSERT INTO PhieuGiaoDich (
            SoPhieu, LoaiPhieu, NgayLap, NguoiLap,
            BoPhanNhanID, NhanVienNhanID, TenNguoiNhan, SoNhanVienCap, GhiChu
        )
        VALUES (
            @SoPhieu, @LoaiPhieu, GETDATE(), @NguoiLap,
            @BoPhanID, @NhanVienID,
            CASE WHEN @HoTenNguoiNhan IS NOT NULL THEN LTRIM(RTRIM(@HoTenNguoiNhan)) ELSE NULL END,
            CASE WHEN @LoaiPhieu = 'XUAT_CUOC_PB' THEN @SoNhanVienCap ELSE NULL END,
            @GhiChu
        );

        SET @IdPhieuInserted = SCOPE_IDENTITY();

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        SELECT
            @IdPhieuInserted,
            src.MaHang,
            src.SoLuong,
            v.DonGia,
            CASE
                WHEN @LoaiPhieu = 'XUAT_CUOC_PB'
                    THEN N'Cấp bộ phận · ' + CAST(@SoNhanVienCap AS NVARCHAR(12)) + N' NV'
                ELSE N'Cấp cược đồ'
            END
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
