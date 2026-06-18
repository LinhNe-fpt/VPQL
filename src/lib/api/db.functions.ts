import { createServerFn } from "@tanstack/react-start";

import { pingDatabase } from "../db.server";

/** Kiểm tra kết nối SQL Server từ server (không lộ mật khẩu ra client). */
export const checkDatabaseConnection = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const info = await pingDatabase();
    return { connected: true as const, ...info };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không kết nối được CSDL";
    return { connected: false as const, error: message };
  }
});
