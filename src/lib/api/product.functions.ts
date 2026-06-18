import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  deleteVatTu,
  fetchNextMaHang,
  fetchVatTuList,
  insertVatTu,
  updateVatTu,
} from "../vpp-queries.server";
import { saveVatTuImageFromDataUrl } from "../vat-tu-upload.server";

export const getCatalogList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVatTuList();
});

export const suggestMaHang = createServerFn({ method: "POST" })
  .validator(z.object({ prefix: z.enum(["PROD", "BHLD"]) }))
  .handler(async ({ data }) => {
    return fetchNextMaHang(data.prefix);
  });

const vatTuBaseSchema = z.object({
  tenSanPham: z.string().min(1).max(500),
  donViTinh: z.string().min(1).max(50),
  nhomHang: z.string().max(100).optional().nullable(),
  donGia: z.number().min(0),
  minStock: z.number().min(0),
  hinhAnh: z.string().max(500).optional().nullable(),
  changedBy: z.string().max(100).optional().nullable(),
});

const vatTuCreateSchema = vatTuBaseSchema.extend({
  maHang: z.string().min(1).max(50),
});

const vatTuUpdateSchema = vatTuBaseSchema.extend({
  maHang: z.string().min(1).max(50),
});

const vatTuDeleteSchema = z.object({
  maHang: z.string().min(1).max(50),
  changedBy: z.string().max(100).optional().nullable(),
});

export const createVatTu = createServerFn({ method: "POST" })
  .validator(vatTuCreateSchema)
  .handler(async ({ data }) => {
    await insertVatTu({
      maHang: data.maHang.trim().toUpperCase(),
      tenSanPham: data.tenSanPham,
      donViTinh: data.donViTinh,
      nhomHang: data.nhomHang,
      donGia: data.donGia,
      minStock: data.minStock,
      hinhAnh: data.hinhAnh,
      changedBy: data.changedBy?.trim() || null,
    });
    return { ok: true as const };
  });

export const updateVatTuFn = createServerFn({ method: "POST" })
  .validator(vatTuUpdateSchema)
  .handler(async ({ data }) => {
    await updateVatTu({
      maHang: data.maHang.trim().toUpperCase(),
      tenSanPham: data.tenSanPham,
      donViTinh: data.donViTinh,
      nhomHang: data.nhomHang,
      donGia: data.donGia,
      minStock: data.minStock,
      hinhAnh: data.hinhAnh,
      changedBy: data.changedBy?.trim() || null,
    });
    return { ok: true as const };
  });

export const deleteVatTuFn = createServerFn({ method: "POST" })
  .validator(vatTuDeleteSchema)
  .handler(async ({ data }) => {
    await deleteVatTu(data.maHang.trim().toUpperCase(), data.changedBy?.trim() || null);
    return { ok: true as const };
  });

const uploadImageSchema = z.object({
  maHang: z.string().min(1).max(50),
  dataUrl: z.string().min(32).max(8_000_000),
});

export const uploadVatTuImage = createServerFn({ method: "POST" })
  .validator(uploadImageSchema)
  .handler(async ({ data }) => {
    const url = await saveVatTuImageFromDataUrl(data.maHang.trim().toUpperCase(), data.dataUrl);
    return { url };
  });

// Aliases cũ (tương thích)
export const getProdList = getCatalogList;
export const getNextProdMaHang = createServerFn({ method: "GET" }).handler(async () => fetchNextMaHang("PROD"));
export const createProd = createVatTu;
export const updateProd = updateVatTuFn;
export const deleteProd = deleteVatTuFn;
