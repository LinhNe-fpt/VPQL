/**
 * Chạy file SQL (tách theo GO): node scripts/run-sql-file.mjs database/sp_TaoPhieuThuHoiKho.sql
 */
import sql from "mssql";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql-file.mjs <path-to-sql>");
  process.exit(1);
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
    enableArithAbort: true,
  },
};

const script = readFileSync(resolve(root, file), "utf8");
const batches = script
  .split(/\bGO\b/i)
  .map((s) => s.trim())
  .filter((s) => s && !/^USE\s+VPP/i.test(s));

const pool = await sql.connect(config);
for (const batch of batches) {
  await pool.request().query(batch);
}
await pool.close();
console.log(`✓ Đã chạy ${batches.length} batch từ ${file}`);
