USE VPP;
GO

-- Áo gile (size S–5XL) — thay áo mưa & áo đồng phục mùa đông

DECLARE @NhomCuocDo NVARCHAR(100) = (SELECT TOP 1 NhomHang FROM DanhMucVatTu WHERE MaHang = 'CD-DP-M');
IF @NhomCuocDo IS NULL SET @NhomCuocDo = N'Cược đồ';

DECLARE @Sizes TABLE (SizeCode VARCHAR(5));
INSERT INTO @Sizes VALUES ('S'), ('M'), ('L'), ('XL'), ('2XL'), ('3XL'), ('4XL'), ('5XL');

INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock, HinhAnh)
SELECT
    'CD-GILE-' + s.SizeCode,
    N'Áo gile size ' + s.SizeCode,
    N'Bộ',
    @NhomCuocDo,
    320000,
    5,
    '/images/vat-tu/cd-gile.svg'
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = 'CD-GILE-' + s.SizeCode);
GO

MERGE TonKhoHienTai AS target
USING (
    SELECT v.MaHang, 50 AS SoLuongTon
    FROM DanhMucVatTu v
    WHERE v.MaHang LIKE 'CD-GILE-%'
) AS source
ON target.MaHang = source.MaHang
WHEN MATCHED THEN
    UPDATE SET target.SoLuongTon = source.SoLuongTon, target.NgayCapNhatCuoi = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (MaHang, SoLuongTon, NgayCapNhatCuoi)
    VALUES (source.MaHang, source.SoLuongTon, GETDATE());
GO

MERGE DinhMucCapPhat AS target
USING (
    VALUES
        (N'Nhân viên văn phòng', 'CD-GILE-M', 1, N'Áo gile / năm')
) AS source (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
ON target.ChucDanh = source.ChucDanh AND target.MaHang = source.MaHang
WHEN NOT MATCHED THEN
    INSERT (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (source.ChucDanh, source.MaHang, source.SoLuongToiDa, source.GhiChu);
GO
