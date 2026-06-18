USE VPP;
GO

-- Thu hồi BHLĐ: hỗ trợ trả theo nhân viên hoặc theo bộ phận

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
    DECLARE @TenBoPhan NVARCHAR(255) = NULL;

    DECLARE @DongHang TABLE (
        MaHang VARCHAR(50),
        SoLuong DECIMAL(18,2),
        DonGia DECIMAL(18,2),
        NgayCap DATE,
        NgayThuHoi DATE,
        SoThangSuDung INT
    );

    BEGIN TRANSACTION;
    BEGIN TRY
        IF ( @MaNV IS NULL OR LTRIM(RTRIM(@MaNV)) = '' )
           AND ( @MaBoPhan IS NULL OR LTRIM(RTRIM(@MaBoPhan)) = '' )
            RAISERROR(N'Phiếu thu hồi BHLĐ cần chọn nhân viên hoặc bộ phận trả đồ.', 16, 1);

        IF @MaBoPhan IS NOT NULL AND LTRIM(RTRIM(@MaBoPhan)) <> ''
        BEGIN
            SELECT @BoPhanID = ID, @TenBoPhan = TenBoPhan
            FROM DanhMucBoPhan
            WHERE MaBoPhan = LTRIM(RTRIM(@MaBoPhan));

            IF @BoPhanID IS NULL
                RAISERROR(N'Mã bộ phận không hợp lệ.', 16, 1);
        END

        IF @MaNV IS NOT NULL AND LTRIM(RTRIM(@MaNV)) <> ''
        BEGIN
            SELECT @NhanVienID = nv.ID, @BoPhanID = COALESCE(@BoPhanID, nv.BoPhanID)
            FROM DanhMucNhanVien nv
            WHERE nv.MaNV = LTRIM(RTRIM(@MaNV));

            IF @HoTenNguoiTra IS NULL OR LTRIM(RTRIM(@HoTenNguoiTra)) = ''
                SELECT @HoTenNguoiTra = HoTen
                FROM DanhMucNhanVien
                WHERE MaNV = LTRIM(RTRIM(@MaNV));
        END
        ELSE IF @TenBoPhan IS NOT NULL
        BEGIN
            SET @HoTenNguoiTra = @TenBoPhan;
        END

        INSERT INTO @DongHang (MaHang, SoLuong, DonGia, NgayCap, NgayThuHoi, SoThangSuDung)
        SELECT
            j.MaHang,
            j.SoLuong,
            ISNULL(j.DonGia, v.DonGia),
            TRY_CAST(j.NgayCap AS DATE),
            TRY_CAST(j.NgayThuHoi AS DATE),
            CASE
                WHEN TRY_CAST(j.NgayCap AS DATE) IS NULL OR TRY_CAST(j.NgayThuHoi AS DATE) IS NULL THEN
                    CASE WHEN j.SoThangSuDung IS NOT NULL AND j.SoThangSuDung > 0 THEN j.SoThangSuDung ELSE 1 END
                WHEN TRY_CAST(j.NgayThuHoi AS DATE) < TRY_CAST(j.NgayCap AS DATE) THEN 1
                ELSE
                    CASE
                        WHEN DATEDIFF(MONTH, TRY_CAST(j.NgayCap AS DATE), TRY_CAST(j.NgayThuHoi AS DATE)) < 1 THEN 1
                        ELSE DATEDIFF(MONTH, TRY_CAST(j.NgayCap AS DATE), TRY_CAST(j.NgayThuHoi AS DATE))
                    END
            END
        FROM OPENJSON(@DanhSachHangJson)
        WITH (
            MaHang VARCHAR(50) '$.MaHang',
            SoLuong DECIMAL(18,2) '$.SoLuong',
            DonGia DECIMAL(18,2) '$.DonGia',
            NgayCap VARCHAR(20) '$.NgayCap',
            NgayThuHoi VARCHAR(20) '$.NgayThuHoi',
            SoThangSuDung INT '$.SoThangSuDung'
        ) j
        INNER JOIN DanhMucVatTu v ON j.MaHang = v.MaHang;

        IF (SELECT COUNT(*) FROM OPENJSON(@DanhSachHangJson)) <> (SELECT COUNT(*) FROM @DongHang)
            RAISERROR(N'Có mã hàng không tồn tại trong danh mục.', 16, 1);

        IF NOT EXISTS (SELECT 1 FROM @DongHang)
            RAISERROR(N'Phiếu cần ít nhất một dòng hàng.', 16, 1);

        IF EXISTS (SELECT 1 FROM @DongHang WHERE SoLuong <= 0)
            RAISERROR(N'Số lượng thu hồi phải lớn hơn 0.', 16, 1);

        IF EXISTS (SELECT 1 FROM @DongHang WHERE NgayCap IS NULL OR NgayThuHoi IS NULL)
            RAISERROR(N'Mỗi dòng cần ngày cấp và ngày thu hồi.', 16, 1);

        INSERT INTO PhieuGiaoDich (
            SoPhieu, LoaiPhieu, NgayLap, NguoiLap,
            BoPhanNhanID, NhanVienNhanID, TenNguoiNhan, GhiChu
        )
        VALUES (
            @SoPhieu, 'THU_HOI_BHLD', GETDATE(), @NguoiLap,
            @BoPhanID, @NhanVienID,
            CASE WHEN @HoTenNguoiTra IS NOT NULL THEN LTRIM(RTRIM(@HoTenNguoiTra)) ELSE NULL END,
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
            N'Thu hồi BHLĐ nội bộ · đã sử dụng',
            d.NgayCap,
            d.NgayThuHoi,
            d.SoThangSuDung,
            N'đã sử dụng'
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
