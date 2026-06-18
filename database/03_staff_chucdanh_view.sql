USE VPP;
GO

IF COL_LENGTH('DanhMucNhanVien', 'ChucDanh') IS NULL
BEGIN
    ALTER TABLE DanhMucNhanVien ADD ChucDanh NVARCHAR(100) NULL;
END
GO

CREATE OR ALTER VIEW v_DanhSachNhanVienChiTiet AS
SELECT
    nv.ID,
    nv.MaNV,
    nv.HoTen,
    nv.ChucDanh,
    nv.BoPhanID,
    bp.MaBoPhan,
    bp.TenBoPhan,
    nv.SizeAo,
    nv.SizeGiay,
    nv.TrangThai
FROM DanhMucNhanVien nv
LEFT JOIN DanhMucBoPhan bp ON nv.BoPhanID = bp.ID;
GO
