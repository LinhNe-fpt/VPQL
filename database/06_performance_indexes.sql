USE VPP;
GO

-- Tăng tốc truy vấn phiếu theo loại / thời gian / nhân viên (view định mức, dashboard)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PhieuGiaoDich_Loai_Ngay_NhanVien'
      AND object_id = OBJECT_ID('dbo.PhieuGiaoDich')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_PhieuGiaoDich_Loai_Ngay_NhanVien
        ON dbo.PhieuGiaoDich (LoaiPhieu, NgayLap, NhanVienNhanID)
        INCLUDE (SoPhieu, NguoiLap, BoPhanNhanID, GhiChu);
END;
GO

-- Tăng tốc join chi tiết phiếu theo mã hàng
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_ChiTietGiaoDich_Phieu_MaHang'
      AND object_id = OBJECT_ID('dbo.ChiTietGiaoDich')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ChiTietGiaoDich_Phieu_MaHang
        ON dbo.ChiTietGiaoDich (PhieuID, MaHang)
        INCLUDE (SoLuong, DonGia);
END;
GO
