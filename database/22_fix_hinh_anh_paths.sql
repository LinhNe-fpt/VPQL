USE VPP;
GO

-- Sửa đường dẫn ảnh upload bị lưu thiếu "/" hoặc chỉ tên file

UPDATE DanhMucVatTu
SET HinhAnh = '/images/vat-tu/uploads/' + LTRIM(RTRIM(HinhAnh))
WHERE HinhAnh IS NOT NULL
  AND LTRIM(RTRIM(HinhAnh)) <> ''
  AND LTRIM(RTRIM(HinhAnh)) NOT LIKE '/%'
  AND LTRIM(RTRIM(HinhAnh)) NOT LIKE 'http%'
  AND LTRIM(RTRIM(HinhAnh)) NOT LIKE 'data:%'
  AND LTRIM(RTRIM(HinhAnh)) NOT LIKE '%/%'
  AND (
    LTRIM(RTRIM(HinhAnh)) LIKE '%.png'
    OR LTRIM(RTRIM(HinhAnh)) LIKE '%.jpg'
    OR LTRIM(RTRIM(HinhAnh)) LIKE '%.jpeg'
    OR LTRIM(RTRIM(HinhAnh)) LIKE '%.webp'
    OR LTRIM(RTRIM(HinhAnh)) LIKE '%.gif'
  );

UPDATE DanhMucVatTu
SET HinhAnh = '/' + LTRIM(RTRIM(HinhAnh))
WHERE LTRIM(RTRIM(HinhAnh)) LIKE 'images/%'
  AND LTRIM(RTRIM(HinhAnh)) NOT LIKE '/%';
GO
