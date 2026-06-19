/**
 * Chạy migration CSDL theo thứ tự (schema + SP + fix Unicode + view).
 * Usage: node scripts/bootstrap-db.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sql from "mssql";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const MIGRATIONS = [
  "database/08_bootstrap_missing_tables.sql",
  "database/04_dinh_muc_cap_phat.sql",
  "database/03_staff_chucdanh_view.sql",
  "database/05_v_tiendo_dinh_muc.sql",
  "database/09_cuoc_do.sql",
  "database/10_cuoc_do_manual_catalog.sql",
  "database/11_cuoc_do_bo_phan.sql",
  "database/12_lich_su_thay_doi.sql",
  "database/14_thu_hoi_bhld.sql",
  "database/20_vat_tu_hinh_anh.sql",
  "database/sp_TaoPhieuNhapKhoToanBo.sql",
  "database/sp_TaoPhieuXuatKhoToanBo.sql",
  "database/sp_TaoPhieuThuHoiKho.sql",
  "database/19_unify_kho_dong_phuc.sql",
  "database/16_thu_hoi_don_gian.sql",
  "database/29_fix_vietnamese_text.sql",
  "database/30_fix_dinh_muc_unicode.sql",
  "database/31_cuoc_do_nv_cn_bo_phan.sql",
  "database/32_kiem_ke_kho.sql",
  "database/33_fix_cuoc_do_view.sql",
  "database/34_lich_su_dang_nhap.sql",
];

async function runFile(pool, relPath) {
  const full = resolve(root, relPath);
  if (!existsSync(full)) {
    console.warn(`SKIP (missing): ${relPath}`);
    return;
  }
  const raw = readFileSync(full, "utf8");
  const batches = raw
    .split(/^\s*GO\s*$/im)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  console.log(`RUN ${relPath} (${batches.length} batch(es))`);
  for (const batch of batches) {
    await pool.request().query(batch);
  }
}

const config = {
  server: process.env.DB_SERVER ?? "localhost",
  port: Number(process.env.DB_PORT ?? "1433"),
  database: process.env.DB_NAME ?? "VPP",
  user: process.env.DB_USER ?? "ysv",
  password: process.env.DB_PASSWORD ?? "123",
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
};

const pool = await sql.connect(config);
for (const file of MIGRATIONS) {
  await runFile(pool, file);
}
const check = await pool.request().query("SELECT COUNT(*) AS cnt FROM v_TienDoCuocDoNhanVien");
console.log(`v_TienDoCuocDoNhanVien rows: ${check.recordset[0].cnt}`);
await pool.close();
console.log("Bootstrap complete.");
