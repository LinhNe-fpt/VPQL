USE VPP;
GO

-- Gỡ áo công nhân (CD-CNMOI / CD-CNCT / CD-CNQC)

DELETE FROM DinhMucCapPhat
WHERE MaHang LIKE 'CD-CNMOI-%'
   OR MaHang LIKE 'CD-CNCT-%'
   OR MaHang LIKE 'CD-CNQC-%';

DELETE ct
FROM ChiTietGiaoDich ct
WHERE ct.MaHang LIKE 'CD-CNMOI-%'
   OR ct.MaHang LIKE 'CD-CNCT-%'
   OR ct.MaHang LIKE 'CD-CNQC-%';

DELETE FROM TonKhoHienTai
WHERE MaHang LIKE 'CD-CNMOI-%'
   OR MaHang LIKE 'CD-CNCT-%'
   OR MaHang LIKE 'CD-CNQC-%';

DELETE FROM DanhMucVatTu
WHERE MaHang LIKE 'CD-CNMOI-%'
   OR MaHang LIKE 'CD-CNCT-%'
   OR MaHang LIKE 'CD-CNQC-%';
GO

MERGE DinhMucCapPhat AS target
USING (
    VALUES (N'Công nhân sản xuất', 'CD-GILE-L', 1, N'Áo gile / năm')
) AS source (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
ON target.ChucDanh = source.ChucDanh AND target.MaHang = source.MaHang
WHEN NOT MATCHED THEN
    INSERT (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (source.ChucDanh, source.MaHang, source.SoLuongToiDa, source.GhiChu);
GO
