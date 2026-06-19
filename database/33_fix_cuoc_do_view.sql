USE VPP;
GO

-- Tiến độ cược đồ: lọc theo mã CD-* (đồng bộ SP + catalog), không phụ thuộc NhomHang / Unicode

CREATE OR ALTER VIEW v_TienDoCuocDoNhanVien AS
SELECT
    nv.ID AS NhanVienID,
    nv.MaNV,
    nv.HoTen,
    nv.ChucDanh,
    dm.MaHang,
    v.TenSanPham,
    v.DonViTinh,
    dm.SoLuongToiDa,
    ISNULL(calc.TongCap, 0) AS DaDung,
    CASE
        WHEN (dm.SoLuongToiDa - ISNULL(calc.TongCap, 0)) < 0 THEN 0
        ELSE (dm.SoLuongToiDa - ISNULL(calc.TongCap, 0))
    END AS ConLai,
    CASE
        WHEN dm.SoLuongToiDa > 0 THEN
            CASE
                WHEN (ISNULL(calc.TongCap, 0) / dm.SoLuongToiDa) * 100 < 0 THEN 0
                ELSE (ISNULL(calc.TongCap, 0) / dm.SoLuongToiDa) * 100
            END
        ELSE 0
    END AS PhanTramDaDung
FROM DanhMucNhanVien nv
INNER JOIN DinhMucCapPhat dm ON nv.ChucDanh = dm.ChucDanh
INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang AND v.MaHang LIKE 'CD-%'
OUTER APPLY (
    SELECT SUM(ct.SoLuong) AS TongCap
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.NhanVienNhanID = nv.ID
      AND ct.MaHang = dm.MaHang
      AND p.LoaiPhieu IN ('XUAT_CUOC_NV', 'XUAT_CUOC_CN')
      AND YEAR(p.NgayLap) = YEAR(GETDATE())
) calc;
GO
