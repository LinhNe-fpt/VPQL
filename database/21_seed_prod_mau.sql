USE VPP;
GO

-- Danh mục sản phẩm kho VPP (mã PROD-*) — vật tư nhập/xuất thông thường

MERGE DanhMucVatTu AS target
USING (VALUES
    ('PROD-0001', N'Bút bi Thiên Long TL-027', N'Cây', N'Văn phòng phẩm', 4500, 80, '/images/vat-tu/prod.svg'),
    ('PROD-0002', N'Giấy A4 Double A 70gsm', N'Ream', N'Văn phòng phẩm', 72000, 50, '/images/vat-tu/prod.svg'),
    ('PROD-0003', N'Kẹp bướm 32mm', N'Hộp', N'Văn phòng phẩm', 18000, 30, '/images/vat-tu/prod.svg'),
    ('PROD-0004', N'Bìa còng A4 7cm', N'Cái', N'Văn phòng phẩm', 42000, 20, '/images/vat-tu/prod.svg'),
    ('PROD-0005', N'Mực in HP 12A', N'Hộp', N'Văn phòng phẩm', 850000, 12, '/images/vat-tu/prod.svg'),
    ('PROD-0006', N'Sổ ghi chép A5 200 trang', N'Cuốn', N'Văn phòng phẩm', 28000, 60, '/images/vat-tu/prod.svg')
) AS source (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock, HinhAnh)
ON target.MaHang = source.MaHang
WHEN NOT MATCHED THEN
    INSERT (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock, HinhAnh)
    VALUES (source.MaHang, source.TenSanPham, source.DonViTinh, source.NhomHang, source.DonGia, source.MinStock, source.HinhAnh);
GO

INSERT INTO TonKhoHienTai (MaHang, SoLuongTon)
SELECT v.MaHang, 0
FROM DanhMucVatTu v
WHERE v.MaHang LIKE 'PROD-%'
  AND NOT EXISTS (SELECT 1 FROM TonKhoHienTai t WHERE t.MaHang = v.MaHang);
GO

-- Tồn mẫu cho demo
UPDATE t SET SoLuongTon = src.SoLuongTon
FROM TonKhoHienTai t
INNER JOIN (VALUES
    ('PROD-0001', 412),
    ('PROD-0002', 38),
    ('PROD-0003', 124),
    ('PROD-0004', 56),
    ('PROD-0005', 9),
    ('PROD-0006', 210)
) AS src (MaHang, SoLuongTon) ON src.MaHang = t.MaHang;
GO
