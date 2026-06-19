import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/** IP và User-Agent của client — dùng khi ghi audit đăng nhập. */
export function getClientConnectionMeta(): { ip: string; userAgent: string | null } {
  const forwarded = getRequestHeader("x-forwarded-for");
  const ip =
    getRequestIP({ xForwardedFor: true }) ??
    getRequestIP() ??
    forwarded?.split(",")[0]?.trim() ??
    "unknown";
  const userAgent = getRequestHeader("user-agent") ?? null;
  return { ip: ip.slice(0, 45), userAgent: userAgent?.slice(0, 512) ?? null };
}
