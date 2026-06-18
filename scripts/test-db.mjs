/**
 * Kiểm tra kết nối SQL Server: npm run db:test
 * Yêu cầu: đã chạy database/VPP_schema.sql và database/02_create_login_ysv.sql trong SSMS
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

console.log(`Đang kết nối: ${config.user}@${config.server}:${config.port}/${config.database} ...`);

try {
  const pool = await sql.connect(config);
  const result = await pool.request().query(`
    SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DbName, GETDATE() AS Now
  `);
  console.log("✓ Kết nối thành công:", result.recordset[0]);
  await pool.close();
  process.exit(0);
} catch (err) {
  console.error("✗ Lỗi kết nối:", err.message ?? err);
  process.exit(1);
}
