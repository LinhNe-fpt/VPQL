USE VPP;
GO

-- NV: áo gile · CN: áo đồng phục (tách định mức theo chức danh)

DELETE FROM DinhMucCapPhat
WHERE ChucDanh LIKE N'%nhân viên%'
  AND (MaHang LIKE 'CD-DP-%' OR MaHang = 'CD-DP');

DELETE FROM DinhMucCapPhat
WHERE ChucDanh LIKE N'%công nhân%'
  AND (MaHang LIKE 'CD-GILE-%' OR MaHang = 'CD-GILE');
GO

MERGE DinhMucCapPhat AS target
USING (
    VALUES
        (N'Nhân viên văn phòng', 'CD-GILE-M', 1, N'Áo gile / năm'),
        (N'Công nhân sản xuất',  'CD-DP-L',  2, N'Áo đồng phục / năm')
) AS source (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
ON target.ChucDanh = source.ChucDanh AND target.MaHang = source.MaHang
WHEN NOT MATCHED THEN
    INSERT (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (source.ChucDanh, source.MaHang, source.SoLuongToiDa, source.GhiChu);
GO
