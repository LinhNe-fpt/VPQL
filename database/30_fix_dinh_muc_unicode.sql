USE VPP;
GO

-- Chuẩn hóa DinhMucCapPhat + ChucDanh nhân viên (encoding-safe qua NCHAR)

DECLARE @ChucDanhNV NVARCHAR(100) = N'Nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n v' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng';
DECLARE @ChucDanhCN NVARCHAR(100) = N'C' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n s' + NCHAR(0x1EA3) + N'n xu' + NCHAR(0x1EA5) + N't';

DECLARE @GcGile   NVARCHAR(100) = NCHAR(0x00C1) + N'o gile / n' + NCHAR(0x0103) + N'm';
DECLARE @GcDep    NVARCHAR(100) = N'D' + NCHAR(0x00E9) + N'p / n' + NCHAR(0x0103) + N'm';
DECLARE @GcThe    NVARCHAR(100) = N'Th' + NCHAR(0x1EBB) + N' NV / n' + NCHAR(0x0103) + N'm';
DECLARE @GcChiaKhoa NVARCHAR(100) = N'Ch' + NCHAR(0x00EC) + N'a kh' + NCHAR(0x00F3) + N'a t' + NCHAR(0x1EE7) + N' / n' + NCHAR(0x0103) + N'm';
DECLARE @GcDongPhuc NVARCHAR(100) = NCHAR(0x00C1) + N'o ' + NCHAR(0x0111) + NCHAR(0x1ED3) + N'ng ph' + NCHAR(0x1EE5) + N'c / n' + NCHAR(0x0103) + N'm';
DECLARE @GcCuocDo NVARCHAR(100) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c c' + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c '
                                + NCHAR(0x0111) + NCHAR(0x1ED3) + N' / n' + NCHAR(0x0103) + N'm';
DECLARE @GcGangTay NVARCHAR(120) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c g' + NCHAR(0x0103) + N'ng tay b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9)
                                 + N' h' + NCHAR(0x00E0) + N'ng th' + NCHAR(0x00E1) + N'ng';
DECLARE @GcGiayIn NVARCHAR(120) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c gi' + NCHAR(0x1EA5) + N'y in A4 h' + NCHAR(0x00E0) + N'ng th' + NCHAR(0x00E1) + N'ng';
GO

DELETE FROM DinhMucCapPhat;
GO

DECLARE @ChucDanhNV NVARCHAR(100) = N'Nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n v' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng';
DECLARE @ChucDanhCN NVARCHAR(100) = N'C' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n s' + NCHAR(0x1EA3) + N'n xu' + NCHAR(0x1EA5) + N't';
DECLARE @GcGile   NVARCHAR(100) = NCHAR(0x00C1) + N'o gile / n' + NCHAR(0x0103) + N'm';
DECLARE @GcDep    NVARCHAR(100) = N'D' + NCHAR(0x00E9) + N'p / n' + NCHAR(0x0103) + N'm';
DECLARE @GcThe    NVARCHAR(100) = N'Th' + NCHAR(0x1EBB) + N' NV / n' + NCHAR(0x0103) + N'm';
DECLARE @GcChiaKhoa NVARCHAR(100) = N'Ch' + NCHAR(0x00EC) + N'a kh' + NCHAR(0x00F3) + N'a t' + NCHAR(0x1EE7) + N' / n' + NCHAR(0x0103) + N'm';
DECLARE @GcDongPhuc NVARCHAR(100) = NCHAR(0x00C1) + N'o ' + NCHAR(0x0111) + NCHAR(0x1ED3) + N'ng ph' + NCHAR(0x1EE5) + N'c / n' + NCHAR(0x0103) + N'm';
DECLARE @GcCuocDo NVARCHAR(100) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c c' + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c '
                                + NCHAR(0x0111) + NCHAR(0x1ED3) + N' / n' + NCHAR(0x0103) + N'm';
DECLARE @GcGangTay NVARCHAR(120) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c g' + NCHAR(0x0103) + N'ng tay b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9)
                                 + N' h' + NCHAR(0x00E0) + N'ng th' + NCHAR(0x00E1) + N'ng';
DECLARE @GcGiayIn NVARCHAR(120) = NCHAR(0x0110) + N'inh m' + NCHAR(0x1EE9) + N'c gi' + NCHAR(0x1EA5) + N'y in A4 h' + NCHAR(0x00E0) + N'ng th' + NCHAR(0x00E1) + N'ng';

INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu) VALUES
    (@ChucDanhNV, 'CD-GILE-M', 1, @GcGile),
    (@ChucDanhNV, 'CD-DTD',    1, @GcDep),
    (@ChucDanhNV, 'CD-THE',    1, @GcThe),
    (@ChucDanhNV, 'CD-CKTU',   1, @GcChiaKhoa),
    (@ChucDanhCN, 'CD-DP-L',   2, @GcDongPhuc),
    (@ChucDanhCN, 'CD-DTD',    1, @GcDep),
    (@ChucDanhCN, 'CD-THE',    1, @GcThe),
    (@ChucDanhCN, 'CD-CKTU',   1, @GcChiaKhoa);

IF EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'CD-AO-NV-M')
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (@ChucDanhNV, 'CD-AO-NV-M', 2, @GcCuocDo);

IF EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'CD-AO-CN-L')
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (@ChucDanhCN, 'CD-AO-CN-L', 2, @GcCuocDo);

IF EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'CD-GIAY-CN-42')
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (@ChucDanhCN, 'CD-GIAY-CN-42', 1, @GcCuocDo);

IF EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'NOV0400')
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (@ChucDanhCN, 'NOV0400', 5, @GcGangTay);

IF EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'NOV1364')
    INSERT INTO DinhMucCapPhat (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (@ChucDanhNV, 'NOV1364', 2, @GcGiayIn);
GO

UPDATE DanhMucNhanVien SET
    ChucDanh = N'Nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n v' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng'
WHERE MaNV = 'NV001';

UPDATE DanhMucNhanVien SET
    ChucDanh = N'C' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n s' + NCHAR(0x1EA3) + N'n xu' + NCHAR(0x1EA5) + N't'
WHERE MaNV = 'CN001';
GO
