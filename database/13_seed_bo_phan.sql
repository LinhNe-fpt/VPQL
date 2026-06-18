USE VPP;
GO

-- Danh mục bộ phận chuẩn (MERGE theo MaBoPhan)

MERGE DanhMucBoPhan AS target
USING (
    VALUES
        ('HG',  N'Hành chính nhân sự'),
        ('EQM', N'Thiết bị'),
        ('SX',  N'Sản xuất'),
        ('MM',  N'Kho MM'),
        ('SM',  N'Kho shipment'),
        ('CS',  N'Chất lượng'),
        ('QC',  N'QC')
) AS source (MaBoPhan, TenBoPhan)
ON target.MaBoPhan = source.MaBoPhan
WHEN MATCHED THEN
    UPDATE SET target.TenBoPhan = source.TenBoPhan
WHEN NOT MATCHED THEN
    INSERT (MaBoPhan, TenBoPhan)
    VALUES (source.MaBoPhan, source.TenBoPhan);
GO
