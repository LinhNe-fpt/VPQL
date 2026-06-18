import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  fetchBoPhanList,
  fetchNhanVienFullList,
  fetchNhanVienList,
  insertNhanVien,
  updateNhanVien,
} from "../vpp-queries.server";

export const getBoPhanList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchBoPhanList();
});

export const getNhanVienList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchNhanVienList();
});

export const getNhanVienFullList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchNhanVienFullList();
});

const nhanVienCreateSchema = z.object({
  maNV: z.string().min(1).max(50),
  hoTen: z.string().min(1).max(255),
  chucDanh: z.string().max(100).optional().nullable(),
  boPhanId: z.number().int().positive().optional().nullable(),
  sizeAo: z.string().max(10).optional().nullable(),
  sizeGiay: z.string().max(10).optional().nullable(),
  trangThai: z.string().max(50).optional(),
  changedBy: z.string().max(100).optional().nullable(),
});

const nhanVienUpdateSchema = z.object({
  id: z.number().int().positive(),
  hoTen: z.string().min(1).max(255),
  chucDanh: z.string().max(100).optional().nullable(),
  boPhanId: z.number().int().positive().optional().nullable(),
  sizeAo: z.string().max(10).optional().nullable(),
  sizeGiay: z.string().max(10).optional().nullable(),
  trangThai: z.string().min(1).max(50),
  changedBy: z.string().max(100).optional().nullable(),
});

export const createNhanVien = createServerFn({ method: "POST" })
  .validator(nhanVienCreateSchema)
  .handler(async ({ data }) => {
    await insertNhanVien({
      maNV: data.maNV.trim(),
      hoTen: data.hoTen.trim(),
      chucDanh: data.chucDanh?.trim() || null,
      boPhanId: data.boPhanId ?? null,
      sizeAo: data.sizeAo?.trim() || null,
      sizeGiay: data.sizeGiay?.trim() || null,
      trangThai: data.trangThai ?? "Đang làm việc",
      changedBy: data.changedBy?.trim() || null,
    });
    return { ok: true as const };
  });

export const updateNhanVienFn = createServerFn({ method: "POST" })
  .validator(nhanVienUpdateSchema)
  .handler(async ({ data }) => {
    await updateNhanVien({
      id: data.id,
      hoTen: data.hoTen.trim(),
      chucDanh: data.chucDanh?.trim() || null,
      boPhanId: data.boPhanId ?? null,
      sizeAo: data.sizeAo?.trim() || null,
      sizeGiay: data.sizeGiay?.trim() || null,
      trangThai: data.trangThai,
      changedBy: data.changedBy?.trim() || null,
    });
    return { ok: true as const };
  });
