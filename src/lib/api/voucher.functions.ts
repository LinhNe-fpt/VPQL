import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  execTaoPhieuNhapKho,
  execTaoPhieuThuHoiBhld,
  execTaoPhieuThuHoiKho,
  execTaoPhieuXuatKhoToanBo,
  fetchHangDaCapChoThuHoi,
  fetchVoucherBySoPhieu,
  fetchVoucherSummaries,
  generateSoPhieuNhap,
  generateSoPhieuThuHoi,
  generateSoPhieuThuHoiBhld,
  generateSoPhieuXuat,
} from "../vpp-queries.server";

export const getVoucherList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVoucherSummaries();
});

export const getVoucherDetail = createServerFn({ method: "GET" })
  .validator(z.object({ soPhieu: z.string().min(1) }))
  .handler(async ({ data }) => {
    const detail = await fetchVoucherBySoPhieu(data.soPhieu);
    if (!detail) throw new Error("Không tìm thấy phiếu");
    return detail;
  });

export const getThuHoiHangDaCap = createServerFn({ method: "GET" })
  .validator(
    z.object({
      maNV: z.string().optional(),
      hoTen: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return fetchHangDaCapChoThuHoi(data.maNV ?? "", data.hoTen ?? null);
  });

const xuatLineSchema = z.object({
  maHang: z.string().min(1),
  soLuong: z.number().positive(),
});

const nhapLineSchema = z.object({
  maHang: z.string().min(1),
  soLuong: z.number().positive(),
  donGia: z.number().min(0),
});

export const createPhieuXuat = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        loaiPhieu: z.enum(["XUAT_CN", "XUAT_PB"]),
        nguoiLap: z.string().min(1),
        maBoPhan: z.string().optional(),
        maNV: z.string().optional(),
        ghiChu: z.string().optional(),
        lines: z.array(xuatLineSchema).min(1),
      })
      .superRefine((val, ctx) => {
        if (val.loaiPhieu === "XUAT_CN" && !val.maNV?.trim()) {
          ctx.addIssue({ code: "custom", message: "Phiếu xuất cá nhân cần nhập mã nhân viên", path: ["maNV"] });
        }
        if (val.loaiPhieu === "XUAT_PB" && !val.maBoPhan) {
          ctx.addIssue({ code: "custom", message: "Phiếu xuất phòng ban cần chọn bộ phận", path: ["maBoPhan"] });
        }
      }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuXuat();

    await execTaoPhieuXuatKhoToanBo({
      soPhieu,
      loaiPhieu: data.loaiPhieu,
      nguoiLap: data.nguoiLap,
      maBoPhan: data.loaiPhieu === "XUAT_PB" ? data.maBoPhan : null,
      maNV: data.loaiPhieu === "XUAT_CN" ? data.maNV : null,
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuong: l.soLuong,
      })),
    });

    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });

export const createPhieuNhap = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nguoiLap: z.string().min(1),
      ghiChu: z.string().optional(),
      lines: z.array(nhapLineSchema).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuNhap();

    await execTaoPhieuNhapKho({
      soPhieu,
      nguoiLap: data.nguoiLap,
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuong: l.soLuong,
        DonGia: l.donGia,
      })),
    });

    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });

const bhldLineSchema = z.object({
  maHang: z.string().min(1),
  soLuong: z.number().positive(),
  donGia: z.number().min(0),
});

export const createPhieuThuHoiBhld = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nguoiLap: z.string().min(1),
      maNV: z.string().min(1),
      hoTenNguoiTra: z.string().min(1),
      maBoPhan: z.string().optional(),
      ghiChu: z.string().optional(),
      lines: z.array(bhldLineSchema).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuThuHoiBhld();

    await execTaoPhieuThuHoiBhld({
      soPhieu,
      nguoiLap: data.nguoiLap,
      maNV: data.maNV.trim(),
      maBoPhan: data.maBoPhan?.trim() ?? null,
      hoTenNguoiTra: data.hoTenNguoiTra.trim(),
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuong: l.soLuong,
        DonGia: l.donGia,
      })),
    });

    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });

export const createPhieuThuHoi = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        nguoiLap: z.string().min(1),
        maBoPhan: z.string().optional(),
        maNV: z.string().optional(),
        ghiChu: z.string().optional(),
        lines: z.array(xuatLineSchema).min(1),
      })
      .superRefine((val, ctx) => {
        if (!val.maNV && !val.maBoPhan) {
          ctx.addIssue({
            code: "custom",
            message: "Phiếu thu hồi cần chọn nhân viên hoặc bộ phận nguồn trả",
            path: ["maNV"],
          });
        }
      }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuThuHoi();

    await execTaoPhieuThuHoiKho({
      soPhieu,
      nguoiLap: data.nguoiLap,
      maBoPhan: data.maBoPhan ?? null,
      maNV: data.maNV ?? null,
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuong: l.soLuong,
      })),
    });

    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });
