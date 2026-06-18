USE VPP;
GO

-- Data mẫu cấp phát cược đồ: áo đồng phục (size), dép, thẻ NV, chìa khóa tủ + phiếu mẫu

-- 1. Bổ sung hàng chìa khóa tủ (nhóm Cược đồ = copy từ hàng có sẵn, tránh lỗi encoding)
IF NOT EXISTS (SELECT 1 FROM DanhMucVatTu WHERE MaHang = 'CD-CKTU')
BEGIN
    INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
    SELECT
        'CD-CKTU',
        N'Chìa khóa tủ',
        N'Bộ',
        (SELECT TOP 1 NhomHang FROM DanhMucVatTu WHERE MaHang = 'CD-DP-M'),
        15000,
        10;
END
ELSE
BEGIN
    UPDATE v
    SET v.NhomHang = ref.NhomHang,
        v.TenSanPham = N'Chìa khóa tủ',
        v.DonViTinh = N'Bộ'
    FROM DanhMucVatTu v
    CROSS JOIN (SELECT TOP 1 NhomHang FROM DanhMucVatTu WHERE MaHang = 'CD-DP-M') ref
    WHERE v.MaHang = 'CD-CKTU';
END

-- Đảm bảo đủ size áo đồng phục
DECLARE @HangMuc TABLE (MaPrefix VARCHAR(20), Ten NVARCHAR(120), DonGia DECIMAL(18,2), CoSize BIT);
INSERT INTO @HangMuc VALUES
    ('CD-DP', N'Áo đồng phục', 280000, 1),
    ('CD-DTD', N'Dép tĩnh điện', 120000, 0),
    ('CD-THE', N'Thẻ nhân viên', 50000, 0);

DECLARE @Sizes TABLE (SizeCode VARCHAR(5), SortOrder INT);
INSERT INTO @Sizes VALUES
    ('S', 1), ('M', 2), ('L', 3), ('XL', 4),
    ('2XL', 5), ('3XL', 6), ('4XL', 7), ('5XL', 8);

INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
SELECT
    h.MaPrefix + '-' + s.SizeCode,
    h.Ten + N' size ' + s.SizeCode,
    N'Bộ',
    N'Cược đồ',
    h.DonGia,
    5
FROM @HangMuc h
CROSS JOIN @Sizes s
WHERE h.CoSize = 1
  AND NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = h.MaPrefix + '-' + s.SizeCode);

INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock)
SELECT h.MaPrefix, h.Ten,
    CASE WHEN h.MaPrefix = 'CD-THE' THEN N'Cái' ELSE N'Đôi' END,
    N'Cược đồ', h.DonGia, 10
FROM @HangMuc h
WHERE h.CoSize = 0
  AND NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = h.MaPrefix);
GO

-- 2. Tồn kho mẫu
MERGE TonKhoHienTai AS target
USING (
    SELECT v.MaHang,
        CASE
            WHEN v.MaHang LIKE 'CD-DP-%' THEN 80
            WHEN v.MaHang = 'CD-DTD' THEN 100
            WHEN v.MaHang = 'CD-THE' THEN 150
            WHEN v.MaHang = 'CD-CKTU' THEN 200
            ELSE 40
        END AS SoLuongTon
    FROM DanhMucVatTu v
    WHERE (
          v.MaHang LIKE 'CD-DP-%'
          OR v.MaHang IN ('CD-DTD', 'CD-THE', 'CD-CKTU')
      )
) AS source
ON target.MaHang = source.MaHang
WHEN MATCHED THEN
    UPDATE SET
        target.SoLuongTon = source.SoLuongTon,
        target.NgayCapNhatCuoi = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (MaHang, SoLuongTon, NgayCapNhatCuoi)
    VALUES (source.MaHang, source.SoLuongTon, GETDATE());
GO

-- 3. Nhân viên mẫu
DECLARE @BpHg INT = (SELECT ID FROM DanhMucBoPhan WHERE MaBoPhan = 'HG');
DECLARE @BpSx INT = (SELECT ID FROM DanhMucBoPhan WHERE MaBoPhan = 'SX');

IF NOT EXISTS (SELECT 1 FROM DanhMucNhanVien WHERE MaNV = 'NV001')
    INSERT INTO DanhMucNhanVien (MaNV, HoTen, ChucDanh, BoPhanID, SizeAo, SizeGiay, TrangThai)
    VALUES (N'NV001', N'Nguyễn Văn An', N'Nhân viên văn phòng', @BpHg, 'M', '42', N'Đang làm việc');

IF NOT EXISTS (SELECT 1 FROM DanhMucNhanVien WHERE MaNV = 'CN001')
    INSERT INTO DanhMucNhanVien (MaNV, HoTen, ChucDanh, BoPhanID, SizeAo, SizeGiay, TrangThai)
    VALUES (N'CN001', N'Trần Văn Bình', N'Công nhân sản xuất', @BpSx, 'L', '41', N'Đang làm việc');

UPDATE DanhMucNhanVien SET ChucDanh = N'Nhân viên văn phòng', HoTen = N'Nguyễn Văn An' WHERE MaNV = 'NV001';
UPDATE DanhMucNhanVien SET ChucDanh = N'Công nhân sản xuất', HoTen = N'Trần Văn Bình' WHERE MaNV = 'CN001';
GO

-- 4. Định mức cấp phát năm
MERGE DinhMucCapPhat AS target
USING (
    VALUES
        (N'Nhân viên văn phòng', 'CD-GILE-M', 1, N'Áo gile / năm'),
        (N'Nhân viên văn phòng', 'CD-DTD',   1, N'Dép / năm'),
        (N'Nhân viên văn phòng', 'CD-THE',   1, N'Thẻ NV / năm'),
        (N'Nhân viên văn phòng', 'CD-CKTU',  1, N'Chìa khóa tủ / năm'),
        (N'Công nhân sản xuất',  'CD-DP-L',  2, N'Áo đồng phục / năm'),
        (N'Công nhân sản xuất',  'CD-DTD',   1, N'Dép / năm'),
        (N'Công nhân sản xuất',  'CD-THE',   1, N'Thẻ NV / năm'),
        (N'Công nhân sản xuất',  'CD-CKTU',  1, N'Chìa khóa tủ / năm')
) AS source (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
ON target.ChucDanh = source.ChucDanh AND target.MaHang = source.MaHang
WHEN NOT MATCHED THEN
    INSERT (ChucDanh, MaHang, SoLuongToiDa, GhiChu)
    VALUES (source.ChucDanh, source.MaHang, source.SoLuongToiDa, source.GhiChu);
GO

-- 5. Phiếu cấp phát mẫu (nhân viên)
IF NOT EXISTS (SELECT 1 FROM PhieuGiaoDich WHERE SoPhieu = 'CD26060001')
BEGIN
    EXEC sp_TaoPhieuCuocDoToanBo
        @SoPhieu = 'CD26060001',
        @LoaiPhieu = 'XUAT_CUOC_NV',
        @NguoiLap = N'Thủ kho',
        @HoTenNguoiNhan = N'Nguyễn Văn An',
        @MaNV = 'NV001',
        @GhiChu = N'Cấp đồ tiêu chuẩn nhân viên mới',
        @DanhSachHangJson = N'[
            {"MaHang":"CD-GILE-M","SoLuong":1},
            {"MaHang":"CD-DTD","SoLuong":1},
            {"MaHang":"CD-THE","SoLuong":1},
            {"MaHang":"CD-CKTU","SoLuong":1}
        ]';

    UPDATE ct
    SET ct.GhiChuDong = N'Chìa khóa tủ · Tủ số A-128'
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.SoPhieu = 'CD26060001' AND ct.MaHang = 'CD-CKTU';
END
GO

-- 6. Phiếu cấp phát mẫu (công nhân)
IF NOT EXISTS (SELECT 1 FROM PhieuGiaoDich WHERE SoPhieu = 'CD26060002')
BEGIN
    EXEC sp_TaoPhieuCuocDoToanBo
        @SoPhieu = 'CD26060002',
        @LoaiPhieu = 'XUAT_CUOC_CN',
        @NguoiLap = N'Thủ kho',
        @HoTenNguoiNhan = N'Trần Văn Bình',
        @MaNV = 'CN001',
        @GhiChu = N'Cấp đồ công nhân vào chuyền',
        @DanhSachHangJson = N'[
            {"MaHang":"CD-DP-L","SoLuong":1},
            {"MaHang":"CD-DTD","SoLuong":1},
            {"MaHang":"CD-THE","SoLuong":1},
            {"MaHang":"CD-CKTU","SoLuong":1}
        ]';

    UPDATE ct
    SET ct.GhiChuDong = N'Chìa khóa tủ · Tủ số B-045'
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.SoPhieu = 'CD26060002' AND ct.MaHang = 'CD-CKTU';
END
GO

-- 7. Phiếu cấp bộ phận mẫu (SX — 5 NV)
IF NOT EXISTS (SELECT 1 FROM PhieuGiaoDich WHERE SoPhieu = 'CD26060003')
BEGIN
    EXEC sp_TaoPhieuCuocDoToanBo
        @SoPhieu = 'CD26060003',
        @LoaiPhieu = 'XUAT_CUOC_PB',
        @NguoiLap = N'Thủ kho',
        @MaBoPhan = 'SX',
        @SoNhanVienCap = 5,
        @GhiChu = N'Cấp đồ đầu ca — 5 công nhân',
        @DanhSachHangJson = N'[
            {"MaHang":"CD-DP-L","SoLuong":5},
            {"MaHang":"CD-DTD","SoLuong":5},
            {"MaHang":"CD-THE","SoLuong":5}
        ]';
END
GO
