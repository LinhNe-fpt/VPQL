USE VPP;
GO

-- Bổ sung schema Stockflow khi DB cũ chỉ có bảng KHO (gộp danh mục + tồn)
-- Chạy: node scripts/run-sql-file.mjs database/08_bootstrap_missing_tables.sql

IF OBJECT_ID('DanhMucVatTu', 'U') IS NULL
BEGIN
    CREATE TABLE DanhMucVatTu (
        MaHang VARCHAR(50) PRIMARY KEY,
        TenSanPham NVARCHAR(500) NOT NULL,
        DonViTinh NVARCHAR(50) NOT NULL,
        NhomHang NVARCHAR(100) NULL,
        DonGia DECIMAL(18, 2) NOT NULL DEFAULT 0,
        NhaCungCapID INT NULL,
        MinStock DECIMAL(18, 2) NOT NULL DEFAULT 0,
        NgayTao DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DanhMucVatTu_NCC FOREIGN KEY (NhaCungCapID) REFERENCES DanhMucNhaCungCap(ID)
    );
END;
GO

IF OBJECT_ID('TonKhoHienTai', 'U') IS NULL
BEGIN
    CREATE TABLE TonKhoHienTai (
        MaHang VARCHAR(50) PRIMARY KEY,
        SoLuongTon DECIMAL(18, 2) NOT NULL DEFAULT 0,
        NgayCapNhatCuoi DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TonKhoHienTai_VatTu FOREIGN KEY (MaHang) REFERENCES DanhMucVatTu(MaHang)
    );
END;
GO

IF OBJECT_ID('PhieuGiaoDich', 'U') IS NULL
BEGIN
    CREATE TABLE PhieuGiaoDich (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        SoPhieu VARCHAR(50) NOT NULL UNIQUE,
        LoaiPhieu VARCHAR(20) NOT NULL,
        NgayLap DATETIME NOT NULL DEFAULT GETDATE(),
        NguoiLap NVARCHAR(100) NULL,
        BoPhanNhanID INT NULL,
        NhanVienNhanID INT NULL,
        GhiChu NVARCHAR(500) NULL,
        CONSTRAINT FK_PhieuGiaoDich_BoPhan FOREIGN KEY (BoPhanNhanID) REFERENCES DanhMucBoPhan(ID),
        CONSTRAINT FK_PhieuGiaoDich_NhanVien FOREIGN KEY (NhanVienNhanID) REFERENCES DanhMucNhanVien(ID)
    );
END;
GO

IF OBJECT_ID('ChiTietGiaoDich', 'U') IS NULL
BEGIN
    CREATE TABLE ChiTietGiaoDich (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        PhieuID INT NOT NULL,
        MaHang VARCHAR(50) NOT NULL,
        SoLuong DECIMAL(18, 2) NOT NULL,
        DonGia DECIMAL(18, 2) NOT NULL,
        ThanhTien AS (SoLuong * DonGia),
        GhiChuDong NVARCHAR(255) NULL,
        CONSTRAINT FK_ChiTietGiaoDich_Phieu FOREIGN KEY (PhieuID) REFERENCES PhieuGiaoDich(ID),
        CONSTRAINT FK_ChiTietGiaoDich_VatTu FOREIGN KEY (MaHang) REFERENCES DanhMucVatTu(MaHang)
    );
END;
GO

IF OBJECT_ID('LichSuBienDong', 'U') IS NULL
BEGIN
    CREATE TABLE LichSuBienDong (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        MaHang VARCHAR(50) NOT NULL,
        PhieuID INT NULL,
        LoaiBienDong VARCHAR(20) NOT NULL,
        SoLuongThayDoi DECIMAL(18, 2) NOT NULL,
        TonKhoSauBienDong DECIMAL(18, 2) NULL,
        NgayGio DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_LichSuBienDong_VatTu FOREIGN KEY (MaHang) REFERENCES DanhMucVatTu(MaHang),
        CONSTRAINT FK_LichSuBienDong_Phieu FOREIGN KEY (PhieuID) REFERENCES PhieuGiaoDich(ID)
    );
END;
GO

-- Đồng bộ dữ liệu từ bảng KHO cũ (nếu có) sang DanhMucVatTu + TonKhoHienTai
IF OBJECT_ID('KHO', 'U') IS NOT NULL
BEGIN
    INSERT INTO DanhMucVatTu (MaHang, TenSanPham, DonViTinh, NhomHang, DonGia, MinStock, NgayTao)
    SELECT
        k.MaHang,
        k.TenSanPham,
        k.DonViTinh,
        k.NhomHang,
        ISNULL(k.DonGia, 0),
        0,
        ISNULL(k.NgayCapNhatCuoi, GETDATE())
    FROM KHO k
    WHERE NOT EXISTS (SELECT 1 FROM DanhMucVatTu v WHERE v.MaHang = k.MaHang);

    INSERT INTO TonKhoHienTai (MaHang, SoLuongTon, NgayCapNhatCuoi)
    SELECT
        k.MaHang,
        ISNULL(k.SoLuongTon, 0),
        ISNULL(k.NgayCapNhatCuoi, GETDATE())
    FROM KHO k
    WHERE NOT EXISTS (SELECT 1 FROM TonKhoHienTai t WHERE t.MaHang = k.MaHang);
END;
GO

-- Tạo lại view định mức (phụ thuộc DanhMucVatTu)
IF OBJECT_ID('v_TienDoDinhMucNhanVien', 'V') IS NOT NULL
    DROP VIEW v_TienDoDinhMucNhanVien;
GO

CREATE VIEW v_TienDoDinhMucNhanVien AS
SELECT
    nv.ID AS NhanVienID,
    nv.MaNV,
    nv.HoTen,
    nv.ChucDanh,
    dm.MaHang,
    v.TenSanPham,
    v.DonViTinh,
    dm.SoLuongToiDa,
    CASE
        WHEN (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) < 0 THEN 0
        ELSE (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0))
    END AS DaDung,
    CASE
        WHEN (dm.SoLuongToiDa - (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0))) < 0 THEN 0
        ELSE (dm.SoLuongToiDa - (ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)))
    END AS ConLai,
    CASE
        WHEN dm.SoLuongToiDa > 0 THEN
            CASE
                WHEN ((ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) / dm.SoLuongToiDa) * 100 < 0 THEN 0
                ELSE ((ISNULL(calc.TongXuat, 0) - ISNULL(calc.TongTra, 0)) / dm.SoLuongToiDa) * 100
            END
        ELSE 0
    END AS PhanTramDaDung
FROM DanhMucNhanVien nv
INNER JOIN DinhMucCapPhat dm ON nv.ChucDanh = dm.ChucDanh
INNER JOIN DanhMucVatTu v ON dm.MaHang = v.MaHang
OUTER APPLY (
    SELECT
        SUM(CASE WHEN p.LoaiPhieu = 'XUAT_CN' THEN ct.SoLuong ELSE 0 END) AS TongXuat,
        SUM(CASE WHEN p.LoaiPhieu = 'THU_HOI' THEN ct.SoLuong ELSE 0 END) AS TongTra
    FROM ChiTietGiaoDich ct
    INNER JOIN PhieuGiaoDich p ON ct.PhieuID = p.ID
    WHERE p.NhanVienNhanID = nv.ID
      AND ct.MaHang = dm.MaHang
      AND MONTH(p.NgayLap) = MONTH(GETDATE())
      AND YEAR(p.NgayLap) = YEAR(GETDATE())
) calc;
GO
