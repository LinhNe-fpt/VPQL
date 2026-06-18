USE VPP;
GO

-- Lịch sử thay đổi dữ liệu danh mục (nhân sự, định mức, …) để đối chiếu

IF OBJECT_ID('LichSuThayDoi', 'U') IS NULL
BEGIN
    CREATE TABLE LichSuThayDoi (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        BatchId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        BangDuLieu VARCHAR(100) NOT NULL,
        MaBanGhi NVARCHAR(255) NOT NULL,
        HanhDong VARCHAR(20) NOT NULL,
        TruongThayDoi NVARCHAR(100) NOT NULL,
        TenTruong NVARCHAR(150) NULL,
        GiaTriCu NVARCHAR(MAX) NULL,
        GiaTriMoi NVARCHAR(MAX) NULL,
        NguoiThayDoi NVARCHAR(100) NULL,
        NgayGio DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_LichSuThayDoi_HanhDong CHECK (HanhDong IN ('CREATE', 'UPDATE', 'DELETE'))
    );

    CREATE INDEX IX_LichSuThayDoi_Ngay ON LichSuThayDoi(NgayGio DESC);
    CREATE INDEX IX_LichSuThayDoi_Bang_Ma ON LichSuThayDoi(BangDuLieu, MaBanGhi);
    CREATE INDEX IX_LichSuThayDoi_Batch ON LichSuThayDoi(BatchId);
END
GO
