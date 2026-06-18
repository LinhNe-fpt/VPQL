import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  deleteDinhMuc,
  fetchChucDanhOptions,
  fetchDashboardQuotaAlerts,
  fetchDinhMucList,
  fetchTienDoDinhMucByMaNV,
  upsertDinhMuc,
} from "../vpp-queries.server";

export const getDinhMucList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchDinhMucList();
});

export const getChucDanhOptions = createServerFn({ method: "GET" }).handler(async () => {
  return fetchChucDanhOptions();
});

const dinhMucSchema = z.object({
  chucDanh: z.string().min(1).max(100),
  maHang: z.string().min(1).max(50),
  soLuongToiDa: z.number().positive(),
  ghiChu: z.string().max(500).optional().nullable(),
  changedBy: z.string().max(100).optional().nullable(),
});

export const upsertDinhMucFn = createServerFn({ method: "POST" })
  .validator(dinhMucSchema)
  .handler(async ({ data }) => {
    await upsertDinhMuc({
      chucDanh: data.chucDanh.trim(),
      maHang: data.maHang.trim(),
      soLuongToiDa: data.soLuongToiDa,
      ghiChu: data.ghiChu?.trim() || null,
      changedBy: data.changedBy?.trim() || null,
    });
    return { ok: true as const };
  });

export const deleteDinhMucFn = createServerFn({ method: "POST" })
  .validator(z.object({
    chucDanh: z.string().min(1),
    maHang: z.string().min(1),
    changedBy: z.string().max(100).optional().nullable(),
  }))
  .handler(async ({ data }) => {
    await deleteDinhMuc(data.chucDanh, data.maHang, data.changedBy?.trim() || null);
    return { ok: true as const };
  });

export const getTienDoDinhMucByStaff = createServerFn({ method: "GET" })
  .validator(z.object({ maNV: z.string().min(1) }))
  .handler(async ({ data }) => {
    return fetchTienDoDinhMucByMaNV(data.maNV);
  });

export const getDashboardQuotaAlerts = createServerFn({ method: "GET" }).handler(async () => {
  return fetchDashboardQuotaAlerts();
});
