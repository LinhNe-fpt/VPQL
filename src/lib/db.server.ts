import sql from "mssql";

import { getDatabaseConfig } from "./config.server";

let poolPromise: Promise<sql.ConnectionPool> | undefined;

function buildConfig(): sql.config {
  const db = getDatabaseConfig();

  return {
    server: db.server,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    options: {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

/** Connection pool dùng chung – chỉ gọi từ server (.server.ts / createServerFn). */
export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = sql.connect(buildConfig()).catch((err) => {
      poolPromise = undefined;
      throw err;
    });
  }
  return poolPromise;
}

/** Đóng pool khi shutdown (tùy chọn). */
export async function closeDbPool(): Promise<void> {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = undefined;
  }
}

/** Ping CSDL – dùng kiểm tra kết nối SSMS ↔ ứng dụng. */
export async function pingDatabase(): Promise<{
  ok: true;
  server: string;
  database: string;
  version: string;
  now: string;
}> {
  const pool = await getDbPool();
  const result = await pool.request().query(`
    SELECT
      @@SERVERNAME AS ServerName,
      DB_NAME() AS DatabaseName,
      @@VERSION AS Version,
      CONVERT(VARCHAR(30), GETDATE(), 126) AS ServerTime
  `);

  const row = result.recordset[0] as {
    ServerName: string;
    DatabaseName: string;
    Version: string;
    ServerTime: string;
  };

  return {
    ok: true,
    server: row.ServerName,
    database: row.DatabaseName,
    version: row.Version.split("\n")[0] ?? row.Version,
    now: row.ServerTime,
  };
}

export { sql };
