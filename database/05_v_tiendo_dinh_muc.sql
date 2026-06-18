USE VPP;
GO

CREATE OR ALTER VIEW v_TienDoDinhMucNhanVien AS
SELECT
    nv.ID AS NhanVienID,
    nv.MaNV,
    nv.HoTen,
    nv.ChucDanh,
    dm.MaHang,
    v.TenSanPham,
    v.DonViTinh,
    dm.SoLuongToiDa,
    -- Tiêu hao thực tế = Xuất cá nhân − Thu hồi (không âm)
    CASE
        WHEN (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) < 0 THEN 0
        ELSE (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0))
    END AS DaDung,
    -- Còn lại = Hạn mức − tiêu hao thực tế
    CASE
        WHEN (dm.SoLuongToiDa - (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0))) < 0 THEN 0
        ELSE (dm.SoLuongToiDa - (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)))
    END AS ConLai,
    CASE
        WHEN dm.SoLuongToiDa > 0 THEN
            CASE
                WHEN ((ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) / dm.SoLuongToiDa) * 100 < 0 THEN 0
                ELSE ((ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) / dm.SoLuongToiDa) * 100
            END
        ELSE 0
    END AS PhanTramDaDung
FROM DanhMucNhanVien nv
INNER JOIN DinhMucCapPhat dm ON nv.ChucDanh = dm.ChucDanh
INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang
OUTER APPLY (
    SELECT
        SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END) AS TongXuat,
        SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END) AS TongTra
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.NhanVienNhanID = nv.ID
      AND ct.MaHang = dm.MaHang
      AND MONTH(p.NgayLap) = MONTH(GETDATE())
      AND YEAR(p.NgayLap) = YEAR(GETDATE())
) calc;
GO
