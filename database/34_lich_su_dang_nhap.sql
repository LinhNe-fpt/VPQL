USE VPP;
GO

IF OBJECT_ID('LichSuDangNhap', 'U') IS NULL
BEGIN
    CREATE TABLE LichSuDangNhap (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        MaDangNhap NVARCHAR(100) NOT NULL,
        HoTen NVARCHAR(255) NULL,
        PhuongThuc VARCHAR(20) NOT NULL,
        KetQua VARCHAR(20) NOT NULL,
        DiaChiIP VARCHAR(45) NOT NULL,
        UserAgent NVARCHAR(512) NULL,
        NgayGio DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_LichSuDangNhap_PhuongThuc CHECK (PhuongThuc IN ('PASSWORD', 'PIN')),
        CONSTRAINT CK_LichSuDangNhap_KetQua CHECK (KetQua IN ('SUCCESS', 'FAILED'))
    );

    CREATE INDEX IX_LichSuDangNhap_Ngay ON LichSuDangNhap(NgayGio DESC);
    CREATE INDEX IX_LichSuDangNhap_Ma ON LichSuDangNhap(MaDangNhap, NgayGio DESC);
    CREATE INDEX IX_LichSuDangNhap_IP ON LichSuDangNhap(DiaChiIP, NgayGio DESC);
END
GO
