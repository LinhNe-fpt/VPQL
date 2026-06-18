const PREFIX_IMAGES: [string, string][] = [
  ["CD-DP", "/images/vat-tu/cd-dp.svg"],
  ["CD-GILE", "/images/vat-tu/cd-gile.svg"],
  ["CD-DTD", "/images/vat-tu/cd-dtd.svg"],
  ["CD-CKTU", "/images/vat-tu/cd-cktu.svg"],
  ["CD-THE", "/images/vat-tu/cd-the.svg"],
  ["CD-ABH", "/images/vat-tu/cd-abh.svg"],
  ["BHLD", "/images/vat-tu/cd-abh.svg"],
  ["PROD", "/images/vat-tu/prod.svg"],
];

export const VAT_TU_DEFAULT_IMAGE = "/images/vat-tu/default.svg";

const UPLOAD_PREFIX = "/images/vat-tu/uploads/";
const UPLOAD_FILE_RE = /^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/i;

/** Chuẩn hóa đường dẫn ảnh lưu trong DB hoặc nhập tay. */
export function normalizeVatTuImagePath(hinhAnh?: string | null): string | null {
  const trimmed = hinhAnh?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  let path = trimmed.replace(/\\/g, "/");
  if (!path.startsWith("/")) {
    if (path.startsWith("images/")) path = `/${path}`;
    else if (UPLOAD_FILE_RE.test(path)) path = `${UPLOAD_PREFIX}${path}`;
    else path = `/${path.replace(/^\/+/, "")}`;
  }

  if (path.length > 500) throw new Error("Đường dẫn ảnh quá dài.");
  return path;
}

export function resolveVatTuImageUrl(maHang: string, hinhAnh?: string | null): string {
  const normalized = normalizeVatTuImagePath(hinhAnh);
  if (normalized) return normalized;

  const upper = maHang.toUpperCase();
  for (const [prefix, url] of PREFIX_IMAGES) {
    if (upper === prefix || upper.startsWith(`${prefix}-`)) return url;
  }
  return VAT_TU_DEFAULT_IMAGE;
}
