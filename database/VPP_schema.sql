-- =============================================
-- Stockflow / VPP – Schema CSDL
-- Chạy trong SSMS với quyền sysadmin (sa)
-- =============================================
CREATE DATABASE VPP;
GO

USE VPP;
GO

-- =============================================
-- 2. TẠO CÁC BẢNG DANH MỤC (MASTER DATA)
-- =============================================

CREATE TABLE DanhMucBoPhan (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    MaBoPhan VARCHAR(50) UNIQUE,
    TenBoPhan NVARCHAR(255) NOT NULL,
    GhiChu NVARCHAR(500)
);

CREATE TABLE DanhMucNhaCungCap (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    MaNCC VARCHAR(50) UNIQUE,
    TenNCC NVARCHAR(255) NOT NULL,
    ThongTinLienHe NVARCHAR(500)
);

CREATE TABLE DanhMucNhanVien (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    MaNV VARCHAR(50) UNIQUE NOT NULL,
    HoTen NVARCHAR(255) NOT NULL,
    ChucDanh NVARCHAR(100) NULL,
    BoPhanID INT FOREIGN KEY REFERENCES DanhMucBoPhan(ID),
    SizeAo VARCHAR(10),
    SizeGiay VARCHAR(10),
    TrangThai NVARCHAR(50) DEFAULT N'Đang làm việc'
);

CREATE TABLE DanhMucVatTu (
    MaHang VARCHAR(50) PRIMARY KEY,
    TenSanPham NVARCHAR(500) NOT NULL,
    DonViTinh NVARCHAR(50) NOT NULL,
    NhomHang NVARCHAR(100),
    DonGia DECIMAL(18, 2) DEFAULT 0,
    NhaCungCapID INT FOREIGN KEY REFERENCES DanhMucNhaCungCap(ID),
    MinStock DECIMAL(18, 2) DEFAULT 0,
    NgayTao DATETIME DEFAULT GETDATE()
);

-- =============================================
-- 3. TỒN KHO & BIẾN ĐỘNG
-- =============================================

CREATE TABLE TonKhoHienTai (
    MaHang VARCHAR(50) PRIMARY KEY FOREIGN KEY REFERENCES DanhMucVatTu(MaHang),
    SoLuongTon DECIMAL(18, 2) DEFAULT 0,
    NgayCapNhatCuoi DATETIME DEFAULT GETDATE()
);

-- =============================================
-- 4. GIAO DỊCH NHẬP / XUẤT
-- =============================================

CREATE TABLE PhieuGiaoDich (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    SoPhieu VARCHAR(50) UNIQUE NOT NULL,
    LoaiPhieu VARCHAR(20) NOT NULL,
    NgayLap DATETIME DEFAULT GETDATE(),
    NguoiLap NVARCHAR(100),
    BoPhanNhanID INT FOREIGN KEY REFERENCES DanhMucBoPhan(ID),
    NhanVienNhanID INT FOREIGN KEY REFERENCES DanhMucNhanVien(ID),
    GhiChu NVARCHAR(500)
);

CREATE TABLE ChiTietGiaoDich (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    PhieuID INT FOREIGN KEY REFERENCES PhieuGiaoDich(ID),
    MaHang VARCHAR(50) FOREIGN KEY REFERENCES DanhMucVatTu(MaHang),
    SoLuong DECIMAL(18, 2) NOT NULL,
    DonGia DECIMAL(18, 2) NOT NULL,
    ThanhTien AS (SoLuong * DonGia),
    GhiChuDong NVARCHAR(255)
);

CREATE TABLE LichSuBienDong (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    MaHang VARCHAR(50) FOREIGN KEY REFERENCES DanhMucVatTu(MaHang),
    PhieuID INT FOREIGN KEY REFERENCES PhieuGiaoDich(ID),
    LoaiBienDong VARCHAR(20),
    SoLuongThayDoi DECIMAL(18, 2) NOT NULL,
    TonKhoSauBienDong DECIMAL(18, 2),
    NgayGio DATETIME DEFAULT GETDATE()
);
GO
