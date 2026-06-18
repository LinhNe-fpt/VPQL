USE VPP;
GO

-- Sửa toàn bộ văn bản tiếng Việt (encoding-safe qua NCHAR)

DECLARE @U_Bo      NVARCHAR(5)  = NCHAR(0x0042) + NCHAR(0x1ED9);
DECLARE @U_Cai     NVARCHAR(5)  = NCHAR(0x0043) + NCHAR(0x00E1) + N'i';
DECLARE @U_Doi     NVARCHAR(5)  = NCHAR(0x0044) + NCHAR(0x00F4) + N'i';
DECLARE @U_Cay     NVARCHAR(5)  = NCHAR(0x0043) + NCHAR(0x00E2) + N'y';
DECLARE @U_Hop     NVARCHAR(5)  = NCHAR(0x0048) + NCHAR(0x1ED9) + N'p';
DECLARE @U_Cuon    NVARCHAR(6)  = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'n';
DECLARE @U_CuocDo  NVARCHAR(12) = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c '
                                + NCHAR(0x0111) + NCHAR(0x1ED3);
DECLARE @U_VPP     NVARCHAR(20) = N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph'
                                + NCHAR(0x1EA9) + N'm';
DECLARE @U_BHLD    NVARCHAR(10) = N'BHL' + NCHAR(0x0110);
DECLARE @U_Ao      NVARCHAR(3)  = NCHAR(0x00C1) + N'o';
DECLARE @U_DongPhuc NVARCHAR(12) = NCHAR(0x0111) + NCHAR(0x1ED3) + N'ng ph' + NCHAR(0x1EE5) + N'c';
DECLARE @U_Gile    NVARCHAR(6)  = N' gile';
DECLARE @U_BaoHo   NVARCHAR(10) = N' b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9);
DECLARE @U_Dep     NVARCHAR(12) = N'D' + NCHAR(0x00E9) + N'p t' + NCHAR(0x0129) + N'nh '
                                + NCHAR(0x0111) + N'i' + NCHAR(0x1EC7) + N'n';
DECLARE @U_The     NVARCHAR(14) = N'Th' + NCHAR(0x1EBB) + N' nh' + NCHAR(0x00E2) + N'n vi'
                                + NCHAR(0x00EA) + N'n';
DECLARE @U_ChiaKhoa NVARCHAR(14) = N'Ch' + NCHAR(0x00EC) + N'a kh' + NCHAR(0x00F3) + N'a t'
                                + NCHAR(0x1EE7);
DECLARE @U_DangLam  NVARCHAR(20) = NCHAR(0x0110) + N'ang l' + NCHAR(0x00E0) + N'm vi'
                                + NCHAR(0x1EC7) + N'c';
GO

-- Bộ phận
UPDATE DanhMucBoPhan SET TenBoPhan = N'H' + NCHAR(0x00E0) + N'nh ch' + NCHAR(0x00ED) + N'nh nh' + NCHAR(0x00E2) + N'n s' + NCHAR(0x1EF1) WHERE MaBoPhan = 'HG';
UPDATE DanhMucBoPhan SET TenBoPhan = N'Thi' + NCHAR(0x1EBF) + N't b' + NCHAR(0x1ECB) WHERE MaBoPhan = 'EQM';
UPDATE DanhMucBoPhan SET TenBoPhan = N'S' + NCHAR(0x1EA3) + N'n xu' + NCHAR(0x1EA5) + N't' WHERE MaBoPhan = 'SX';
UPDATE DanhMucBoPhan SET TenBoPhan = N'Kho MM' WHERE MaBoPhan = 'MM';
UPDATE DanhMucBoPhan SET TenBoPhan = N'Kho shipment' WHERE MaBoPhan = 'SM';
UPDATE DanhMucBoPhan SET TenBoPhan = N'Ch' + NCHAR(0x1EA5) + N't l' + NCHAR(0x01B0) + NCHAR(0x1EE3) + N'ng' WHERE MaBoPhan = 'CS';
UPDATE DanhMucBoPhan SET TenBoPhan = N'QC' WHERE MaBoPhan = 'QC';
GO

-- Nhân viên mẫu
UPDATE DanhMucNhanVien SET
    HoTen = N'Nguy' + NCHAR(0x1EC5) + N'n V' + NCHAR(0x0103) + N'n An',
    ChucDanh = N'Nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n v' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng',
    TrangThai = NCHAR(0x0110) + N'ang l' + NCHAR(0x00E0) + N'm vi' + NCHAR(0x1EC7) + N'c'
WHERE MaNV = 'NV001';

UPDATE DanhMucNhanVien SET
    HoTen = N'Tr' + NCHAR(0x1EA7) + N'n V' + NCHAR(0x0103) + N'n B' + NCHAR(0x00EC) + N'nh',
    ChucDanh = N'C' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n s' + NCHAR(0x1EA3) + N'n xu' + NCHAR(0x1EA5) + N't',
    TrangThai = NCHAR(0x0110) + N'ang l' + NCHAR(0x00E0) + N'm vi' + NCHAR(0x1EC7) + N'c'
WHERE MaNV = 'CN001';
GO

-- Danh mục vật tư PROD
MERGE DanhMucVatTu AS target
USING (VALUES
    ('PROD-0001', N'B' + NCHAR(0x00FA) + N't bi Thi' + NCHAR(0x00EA) + N'n Long TL-027', NCHAR(0x0043) + NCHAR(0x00E2) + N'y', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm'),
    ('PROD-0002', N'Gi' + NCHAR(0x1EA5) + N'y A4 Double A 70gsm', N'Ream', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm'),
    ('PROD-0003', N'K' + NCHAR(0x1EB9) + N'p b' + NCHAR(0x01B0) + NCHAR(0x1EDB) + N'm 32mm', NCHAR(0x0048) + NCHAR(0x1ED9) + N'p', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm'),
    ('PROD-0004', N'B' + NCHAR(0x00EC) + N'a c' + NCHAR(0x00F2) + N'ng A4 7cm', NCHAR(0x0043) + NCHAR(0x00E1) + N'i', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm'),
    ('PROD-0005', N'M' + NCHAR(0x1EF1) + N'c in HP 12A', NCHAR(0x0048) + NCHAR(0x1ED9) + N'p', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm'),
    ('PROD-0006', N'S' + NCHAR(0x1ED5) + N' ghi ch' + NCHAR(0x00E9) + N'p A5 200 trang', NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'n', N'V' + NCHAR(0x0103) + N'n ph' + NCHAR(0x00F2) + N'ng ph' + NCHAR(0x1EA9) + N'm')
) AS source (MaHang, TenSanPham, DonViTinh, NhomHang)
ON target.MaHang = source.MaHang
WHEN MATCHED THEN
    UPDATE SET target.TenSanPham = source.TenSanPham, target.DonViTinh = source.DonViTinh, target.NhomHang = source.NhomHang;
GO

-- BHLD
MERGE DanhMucVatTu AS target
USING (VALUES
    ('BHLD-AO',   NCHAR(0x00C1) + N'o b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9) + N' lao ' + NCHAR(0x0111) + NCHAR(0x1ED9) + N'ng', NCHAR(0x0043) + NCHAR(0x00E1) + N'i', N'BHL' + NCHAR(0x0110)),
    ('BHLD-GANG', N'G' + NCHAR(0x0103) + N'ng tay b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9), NCHAR(0x0044) + NCHAR(0x00F4) + N'i', N'BHL' + NCHAR(0x0110)),
    ('BHLD-MU',   N'M' + NCHAR(0x0169) + N' b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9), NCHAR(0x0043) + NCHAR(0x00E1) + N'i', N'BHL' + NCHAR(0x0110)),
    ('BHLD-KINH', N'K' + NCHAR(0x00ED) + N'nh b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9), NCHAR(0x0043) + NCHAR(0x00E1) + N'i', N'BHL' + NCHAR(0x0110)),
    ('BHLD-GIAY', N'Gi' + NCHAR(0x00E0) + N'y b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9), NCHAR(0x0044) + NCHAR(0x00F4) + N'i', N'BHL' + NCHAR(0x0110))
) AS source (MaHang, TenSanPham, DonViTinh, NhomHang)
ON target.MaHang = source.MaHang
WHEN MATCHED THEN
    UPDATE SET target.TenSanPham = source.TenSanPham, target.DonViTinh = source.DonViTinh, target.NhomHang = source.NhomHang;
GO

-- Cược đồ: tên + đơn vị theo mã
UPDATE DanhMucVatTu SET
    TenSanPham = NCHAR(0x00C1) + N'o ' + NCHAR(0x0111) + NCHAR(0x1ED3) + N'ng ph' + NCHAR(0x1EE5) + N'c size ' + SUBSTRING(MaHang, 7, 10),
    DonViTinh = NCHAR(0x0042) + NCHAR(0x1ED9),
    NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3)
WHERE MaHang LIKE 'CD-DP-%';

UPDATE DanhMucVatTu SET
    TenSanPham = NCHAR(0x00C1) + N'o gile size ' + SUBSTRING(MaHang, 9, 10),
    DonViTinh = NCHAR(0x0042) + NCHAR(0x1ED9),
    NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3)
WHERE MaHang LIKE 'CD-GILE-%';

UPDATE DanhMucVatTu SET
    TenSanPham = NCHAR(0x00C1) + N'o b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9) + N' size ' + SUBSTRING(MaHang, 8, 10),
    DonViTinh = NCHAR(0x0042) + NCHAR(0x1ED9),
    NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3)
WHERE MaHang LIKE 'CD-ABH-%';

UPDATE DanhMucVatTu SET TenSanPham = N'D' + NCHAR(0x00E9) + N'p t' + NCHAR(0x0129) + N'nh ' + NCHAR(0x0111) + N'i' + NCHAR(0x1EC7) + N'n', DonViTinh = NCHAR(0x0044) + NCHAR(0x00F4) + N'i', NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-DTD';
UPDATE DanhMucVatTu SET TenSanPham = N'Th' + NCHAR(0x1EBB) + N' nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n', DonViTinh = NCHAR(0x0043) + NCHAR(0x00E1) + N'i', NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-THE';
UPDATE DanhMucVatTu SET TenSanPham = N'Ch' + NCHAR(0x00EC) + N'a kh' + NCHAR(0x00F3) + N'a t' + NCHAR(0x1EE7), DonViTinh = NCHAR(0x0043) + NCHAR(0x00E1) + N'i', NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-CKTU';
UPDATE DanhMucVatTu SET TenSanPham = N'Gi' + NCHAR(0x00E0) + N'y b' + NCHAR(0x1EA3) + N'o h' + NCHAR(0x1ED9) + N' c' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n 42', DonViTinh = NCHAR(0x0044) + NCHAR(0x00F4) + N'i', NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-GIAY-CN-42';
UPDATE DanhMucVatTu SET TenSanPham = NCHAR(0x00C1) + N'o c' + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) + N' nh' + NCHAR(0x00E2) + N'n vi' + NCHAR(0x00EA) + N'n nam M', DonViTinh = NCHAR(0x0042) + NCHAR(0x1ED9), NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-AO-NV-M';
UPDATE DanhMucVatTu SET TenSanPham = NCHAR(0x00C1) + N'o c' + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) + N' c' + NCHAR(0x00F4) + N'ng nh' + NCHAR(0x00E2) + N'n L', DonViTinh = NCHAR(0x0042) + NCHAR(0x1ED9), NhomHang = NCHAR(0x0043) + NCHAR(0x01B0) + NCHAR(0x1ED1) + N'c ' + NCHAR(0x0111) + NCHAR(0x1ED3) WHERE MaHang = 'CD-AO-CN-L';
GO

-- Phiếu: đồng bộ tên người nhận từ hồ sơ NV
UPDATE p SET p.TenNguoiNhan = nv.HoTen
FROM PhieuGiaoDich p
INNER JOIN DanhMucNhanVien nv ON nv.ID = p.NhanVienNhanID
WHERE p.TenNguoiNhan IS NOT NULL;
GO
