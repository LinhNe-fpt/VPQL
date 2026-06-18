import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  execTaoPhieuCuocDoToanBo,
  fetchCuocDoVoucherSummaries,
  fetchTienDoCuocDoByMaNV,
  fetchVatTuCuocDoList,
  fetchVoucherBySoPhieu,
  generateSoPhieuCuocDo,
} from "../vpp-queries.server";

export const getCuocDoVoucherList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchCuocDoVoucherSummaries();
});

export const getCuocDoVoucherDetail = createServerFn({ method: "GET" })
  .validator(z.object({ soPhieu: z.string().min(1) }))
  .handler(async ({ data }) => {
    const detail = await fetchVoucherBySoPhieu(data.soPhieu);
    if (!detail) throw new Error("Không tìm thấy phiếu");
    if (
      detail.loaiPhieu !== "XUAT_CUOC_NV" &&
      detail.loaiPhieu !== "XUAT_CUOC_CN" &&
      detail.loaiPhieu !== "XUAT_CUOC_PB"
    ) {
      throw new Error("Phiếu không thuộc loại cược đồ");
    }
    return detail;
  });

export const getCuocDoVatTuList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVatTuCuocDoList();
});

export const getCuocDoTienDo = createServerFn({ method: "GET" })
  .validator(z.object({ maNV: z.string().min(1) }))
  .handler(async ({ data }) => {
    return fetchTienDoCuocDoByMaNV(data.maNV);
  });

const cuocDoLineSchema = z.object({
  maHang: z.string().min(1),
  soLuong: z.number().positive(),
});

export const createPhieuCuocDo = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        loaiPhieu: z.enum(["XUAT_CUOC_NV", "XUAT_CUOC_CN", "XUAT_CUOC_PB"]),
        nguoiLap: z.string().min(1),
        hoTenNguoiNhan: z.string().optional(),
        maNV: z.string().optional(),
        maBoPhan: z.string().optional(),
        soNhanVien: z.number().int().positive().optional(),
        ghiChu: z.string().optional(),
        lines: z.array(cuocDoLineSchema).min(1),
      })
      .superRefine((val, ctx) => {
        if (val.loaiPhieu === "XUAT_CUOC_PB") {
          if (!val.maBoPhan?.trim()) {
            ctx.addIssue({ code: "custom", message: "Chọn bộ phận nhận", path: ["maBoPhan"] });
          }
          if (!val.soNhanVien || val.soNhanVien < 1) {
            ctx.addIssue({ code: "custom", message: "Nhập số nhân viên cần cấp", path: ["soNhanVien"] });
          }
        } else if (!val.hoTenNguoiNhan?.trim()) {
          ctx.addIssue({ code: "custom", message: "Nhập họ tên người nhận", path: ["hoTenNguoiNhan"] });
        }
      }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuCuocDo();

    await execTaoPhieuCuocDoToanBo({
      soPhieu,
      loaiPhieu: data.loaiPhieu,
      nguoiLap: data.nguoiLap,
      hoTenNguoiNhan: data.hoTenNguoiNhan?.trim() || null,
      maNV: data.maNV?.trim() || null,
      maBoPhan: data.loaiPhieu === "XUAT_CUOC_PB" ? data.maBoPhan?.trim() : null,
      soNhanVienCap: data.loaiPhieu === "XUAT_CUOC_PB" ? data.soNhanVien : null,
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuong: l.soLuong,
      })),
    });

    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });
