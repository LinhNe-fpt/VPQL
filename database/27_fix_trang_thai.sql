USE VPP;
GO

-- Chuẩn hóa TrangThai (một số bản ghi seed bị lỗi encoding)

UPDATE DanhMucNhanVien
SET TrangThai = N'Đang làm việc'
WHERE TrangThai IS NULL
   OR (TrangThai <> N'Nghỉ việc' AND TrangThai NOT LIKE N'%nghỉ việc%');
GO
