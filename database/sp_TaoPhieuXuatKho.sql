-- DEPRECATED: Dùng sp_TaoPhieuXuatKhoToanBo (JSON, một transaction) thay thế.
USE VPP;
GO

CREATE OR ALTER PROCEDURE sp_TaoPhieuXuatKho
    @SoPhieu VARCHAR(50),
    @LoaiPhieu VARCHAR(20),
    @NguoiLap NVARCHAR(100),
    @MaBoPhan VARCHAR(50) = NULL,
    @MaNV VARCHAR(50) = NULL,
    @GhiChu NVARCHAR(500),
    @MaHang VARCHAR(50),
    @SoLuong DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @BoPhanID INT = NULL;
        DECLARE @NhanVienID INT = NULL;
        DECLARE @DonGiaXuat DECIMAL(18,2) = 0;

        IF @MaBoPhan IS NOT NULL
            SELECT @BoPhanID = ID FROM DanhMucBoPhan WHERE MaBoPhan = @MaBoPhan;

        IF @MaNV IS NOT NULL
            SELECT @NhanVienID = ID FROM DanhMucNhanVien WHERE MaNV = @MaNV;

        SELECT @DonGiaXuat = DonGia FROM DanhMucVatTu WHERE MaHang = @MaHang;

        IF @DonGiaXuat IS NULL
        BEGIN
            RAISERROR(N'Mã hàng %s không tồn tại trong danh mục!', 16, 1, @MaHang);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        DECLARE @TonKhoHienTai DECIMAL(18,2) = 0;
        SELECT @TonKhoHienTai = SoLuongTon FROM TonKhoHienTai WHERE MaHang = @MaHang;

        IF @TonKhoHienTai IS NULL OR @TonKhoHienTai < @SoLuong
        BEGIN
            DECLARE @TonKhoStr NVARCHAR(50) = COALESCE(CAST(@TonKhoHienTai AS NVARCHAR(50)), N'0');
            RAISERROR(N'Không đủ hàng xuất kho! Mặt hàng %s hiện chỉ còn tồn: %s', 16, 1, @MaHang, @TonKhoStr);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        DECLARE @PhieuID INT;
        SELECT @PhieuID = ID FROM PhieuGiaoDich WHERE SoPhieu = @SoPhieu;

        IF @PhieuID IS NULL
        BEGIN
            INSERT INTO PhieuGiaoDich (SoPhieu, LoaiPhieu, NgayLap, NguoiLap, BoPhanNhanID, NhanVienNhanID, GhiChu)
            VALUES (@SoPhieu, @LoaiPhieu, GETDATE(), @NguoiLap, @BoPhanID, @NhanVienID, @GhiChu);

            SET @PhieuID = SCOPE_IDENTITY();
        END

        INSERT INTO ChiTietGiaoDich (PhieuID, MaHang, SoLuong, DonGia, GhiChuDong)
        VALUES (@PhieuID, @MaHang, @SoLuong, @DonGiaXuat, N'Xuất kho');

        UPDATE TonKhoHienTai
        SET SoLuongTon = SoLuongTon - @SoLuong,
            NgayCapNhatCuoi = GETDATE()
        WHERE MaHang = @MaHang;

        DECLARE @TonSauBienDong DECIMAL(18,2);
        SELECT @TonSauBienDong = SoLuongTon FROM TonKhoHienTai WHERE MaHang = @MaHang;

        INSERT INTO LichSuBienDong (MaHang, PhieuID, LoaiBienDong, SoLuongThayDoi, TonKhoSauBienDong, NgayGio)
        VALUES (@MaHang, @PhieuID, 'GIAM', @SoLuong, @TonSauBienDong, GETDATE());

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
/**
  gsadygygdahKJHJdaDG Y
  DHsdjd
  DHsudhJS JJKSBHCB'sFHHsd
  DhdyGSD
  đJSIDSDYGDUD
  ÁPdsad
  sădsdaushdkd
  odhudhJDd
  DHUDUHudjd
  sgdoasdD
  Dahd
  aDAYGFd]FHd
  aHIaduW
  ƯHDiid
  ưdWDHoe\due
  [hù
  3e3dOKD
  SidhuhUJD0J
  dhuHDSJsjd
  DHush9 ưd
  ĐuiJDI JUFUjoufygP
  iHUjdDaodhou
  Dhdushod
  DÚHOU08ud
  HDHU9hd
  SH7u
  UDH0u2eofid
  UgfgcOW0D
  dhiw0000usdad\w0000usdadD9Y2YE2
  2Eyeo2ee
  EEe
  D45585
   ]  @MaHang: Mã vật tư
    @SoLuong: Số lượng xuất kho
*/