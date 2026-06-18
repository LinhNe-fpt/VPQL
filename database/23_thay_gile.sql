USE VPP;
GO

-- Thay áo mưa (CD-AM) + áo đồng phục mùa đông (CD-DPD) → áo gile (CD-GILE)

DECLARE @NhomCuocDo NVARCHAR(100) = (
    SELECT TOP 1 NhomHang FROM DanhMucVatTu WHERE MaHang LIKE 'CD-DP-%'
);
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

INSERT INTO TonKhoHienTai (MaHang, SoLuongTon)
SELECT 'CD-GILE-' + s.SizeCode, 0
FROM @Sizes s
WHERE NOT EXISTS (SELECT 1 FROM TonKhoHienTai t WHERE t.MaHang = 'CD-GILE-' + s.SizeCode);

UPDATE t
SET t.SoLuongTon = ISNULL(t.SoLuongTon, 0) + ISNULL(src.AddQty, 0),
    t.NgayCapNhatCuoi = GETDATE()
FROM TonKhoHienTai t
INNER JOIN (
    SELECT
        s.SizeCode,
        SUM(ISNULL(tk.SoLuongTon, 0)) AS AddQty
    FROM @Sizes s
    LEFT JOIN TonKhoHienTai tk ON tk.MaHang IN ('CD-AM-' + s.SizeCode, 'CD-DPD-' + s.SizeCode)
    GROUP BY s.SizeCode
) src ON t.MaHang = 'CD-GILE-' + src.SizeCode
WHERE ISNULL(src.AddQty, 0) > 0;
GO

UPDATE ChiTietGiaoDich
SET MaHang = REPLACE(MaHang, 'CD-AM-', 'CD-GILE-')
WHERE MaHang LIKE 'CD-AM-%';

UPDATE ChiTietGiaoDich
SET MaHang = REPLACE(MaHang, 'CD-DPD-', 'CD-GILE-')
WHERE MaHang LIKE 'CD-DPD-%';
GO

-- Gộp định mức: xóa CD-DPD trước (cùng size với CD-AM sẽ thành một mã CD-GILE)
DELETE FROM DinhMucCapPhat WHERE MaHang LIKE 'CD-DPD-%';

UPDATE DinhMucCapPhat
SET MaHang = REPLACE(MaHang, 'CD-AM-', 'CD-GILE-'),
    GhiChu = N'Áo gile / năm'
WHERE MaHang LIKE 'CD-AM-%';
GO

DELETE dm
FROM DinhMucCapPhat dm
INNER JOIN (
    SELECT ChucDanh, MaHang,
        ROW_NUMBER() OVER (PARTITION BY ChucDanh, MaHang ORDER BY ChucDanh) AS rn
    FROM DinhMucCapPhat
    WHERE MaHang LIKE 'CD-GILE-%'
) x ON dm.ChucDanh = x.ChucDanh AND dm.MaHang = x.MaHang AND x.rn > 1;
GO

DELETE FROM TonKhoHienTai WHERE MaHang LIKE 'CD-AM-%' OR MaHang LIKE 'CD-DPD-%';
DELETE FROM DanhMucVatTu WHERE MaHang LIKE 'CD-AM-%' OR MaHang LIKE 'CD-DPD-%';

-- Dọn định mức còn trỏ mã đã xóa
DELETE FROM DinhMucCapPhat
WHERE MaHang LIKE 'CD-DPD-%' OR MaHang LIKE 'CD-AM-%'
   OR NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = DinhMucCapPhat.MaHang);
GO
