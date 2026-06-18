USE VPP;
GO

-- Cột hình ảnh sản phẩm (đường dẫn tương đối trong public/)

IF COL_LENGTH('DanhMucVatTu', 'HinhAnh') IS NULL
    ALTER TABLE DanhMucVatTu ADD HinhAnh NVARCHAR(500) NULL;
GO

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-dp.svg'
WHERE (MaHang LIKE 'CD-DP-%' OR MaHang = 'CD-DP') AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-gile.svg'
WHERE (MaHang LIKE 'CD-GILE-%' OR MaHang = 'CD-GILE') AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-dtd.svg'
WHERE MaHang = 'CD-DTD' AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-cktu.svg'
WHERE MaHang = 'CD-CKTU' AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-the.svg'
WHERE MaHang = 'CD-THE' AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/cd-abh.svg'
WHERE (MaHang LIKE 'CD-ABH-%' OR MaHang = 'CD-ABH') AND (HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '');

UPDATE DanhMucVatTu SET HinhAnh = '/images/vat-tu/default.svg'
WHERE HinhAnh IS NULL OR LTRIM(RTRIM(HinhAnh)) = '';
GO
