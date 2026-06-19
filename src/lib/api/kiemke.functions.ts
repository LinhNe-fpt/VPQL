import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  execTaoPhieuKiemKe,
  fetchBienDongLedger,
  fetchVatTuList,
  fetchVoucherBySoPhieu,
  fetchVoucherSummaries,
  generateSoPhieuKiemKe,
} from "../vpp-queries.server";

export const getKiemKeData = createServerFn({ method: "GET" }).handler(async () => {
  const [vatTu, bienDong, vouchers] = await Promise.all([
    fetchVatTuList(),
    fetchBienDongLedger({}),
    fetchVoucherSummaries(),
  ]);
  return {
    vatTu,
    bienDong,
    kiemKeVouchers: vouchers.filter((v) => v.loaiPhieu === "KIEM_KE"),
  };
});

export const getBienDongLedger = createServerFn({ method: "GET" })
  .validator(
    z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      maHang: z.string().optional(),
      nhomHang: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return fetchBienDongLedger({
      dateFrom: data.dateFrom || null,
      dateTo: data.dateTo || null,
      maHang: data.maHang || null,
      nhomHang: data.nhomHang || null,
    });
  });

const kiemKeLineSchema = z.object({
  maHang: z.string().min(1),
  soLuongThucTe: z.number().min(0),
  ghiChu: z.string().optional(),
});

export const createPhieuKiemKe = createServerFn({ method: "POST" })
  .validator(
    z.object({
      nguoiLap: z.string().min(1),
      ghiChu: z.string().optional(),
      lines: z.array(kiemKeLineSchema).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const soPhieu = await generateSoPhieuKiemKe();
    await execTaoPhieuKiemKe({
      soPhieu,
      nguoiLap: data.nguoiLap,
      ghiChu: data.ghiChu ?? null,
      danhSachHang: data.lines.map((l) => ({
        MaHang: l.maHang,
        SoLuongThucTe: l.soLuongThucTe,
        GhiChu: l.ghiChu,
      })),
    });
    const detail = await fetchVoucherBySoPhieu(soPhieu);
    return { soPhieu, detail };
  });

export const getKiemKeVoucherDetail = createServerFn({ method: "GET" })
  .validator(z.object({ soPhieu: z.string().min(1) }))
  .handler(async ({ data }) => {
    const detail = await fetchVoucherBySoPhieu(data.soPhieu);
    if (!detail) throw new Error("Không tìm thấy phiếu");
    if (detail.loaiPhieu !== "KIEM_KE") throw new Error("Phiếu không thuộc loại kiểm kê");
    return detail;
  });
