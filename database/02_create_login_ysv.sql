-- =============================================
-- Tạo login SQL Server: ysv / 123
-- Chạy trong SSMS (New Query) với quyền sysadmin
-- Yêu cầu: SQL Server bật "SQL Server and Windows Authentication mode"
-- =============================================

USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'ysv')
BEGIN
    CREATE LOGIN ysv WITH PASSWORD = N'123', CHECK_POLICY = OFF;
END
GO

USE VPP;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'ysv')
BEGIN
    CREATE USER ysv FOR LOGIN ysv;
END
GO

-- Quyền đọc/ghi toàn bộ schema VPP (môi trường dev)
ALTER ROLE db_datareader ADD MEMBER ysv;
ALTER ROLE db_datawriter ADD MEMBER ysv;
ALTER ROLE db_ddladmin ADD MEMBER ysv;
GO

-- Kiểm tra kết nối (tùy chọn): đăng nhập SSMS với
--   Server: localhost hoặc .\SQLEXPRESS
--   Authentication: SQL Server Authentication
--   Login: ysv  |  Password: 123
--   Database: VPP
