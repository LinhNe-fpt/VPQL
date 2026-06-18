USE VPP;
GO

IF OBJECT_ID('DinhMucCapPhat', 'U') IS NULL
BEGIN
    CREATE TABLE DinhMucCapPhat (
        ChucDanh NVARCHAR(100) NOT NULL,
        MaHang VARCHAR(50) NOT NULL,
        SoLuongToiDa DECIMAL(18, 2) NOT NULL,
        GhiChu NVARCHAR(500) NULL,
        CONSTRAINT PK_DinhMucCapPhat PRIMARY KEY (ChucDanh, MaHang),
        CONSTRAINT FK_DinhMucCapPhat_VatTu FOREIGN KEY (MaHang) REFERENCES DanhMucVatTu(MaHang)
    );
END
GO
