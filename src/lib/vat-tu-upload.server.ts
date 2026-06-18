import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { normalizeVatTuImagePath } from "./vat-tu-image";

const UPLOAD_PUBLIC_PREFIX = "/images/vat-tu/uploads";
const MAX_BYTES = 3 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function projectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "public"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  return process.cwd();
}

function uploadDir(): string {
  return join(projectRoot(), "public", "images", "vat-tu", "uploads");
}

function safeSlug(maHang: string): string {
  return maHang
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "vat-tu";
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP hoặc GIF.");
  }

  const mime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (buffer.length === 0) throw new Error("File ảnh rỗng.");
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Ảnh quá lớn (tối đa ${Math.round(MAX_BYTES / 1024 / 1024)}MB).`);
  }

  return { mime, buffer };
}

/** Lưu ảnh từ data URL (chọn từ thiết bị) vào public/uploads, trả về đường dẫn web. */
export async function saveVatTuImageFromDataUrl(maHang: string, dataUrl: string): Promise<string> {
  const code = maHang.trim();
  if (!code) throw new Error("Cần mã hàng trước khi lưu ảnh.");

  const { mime, buffer } = parseDataUrl(dataUrl);
  const ext = MIME_EXT[mime] ?? "jpg";
  const fileName = `${safeSlug(code)}-${Date.now()}.${ext}`;
  const dir = uploadDir();

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), buffer);

  return normalizeVatTuImagePath(`${UPLOAD_PUBLIC_PREFIX}/${fileName}`)!;
}
