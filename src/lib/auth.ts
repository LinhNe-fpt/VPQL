import { useEffect, useState } from "react";

import i18n from "@/lib/i18n";

export const SESSION_KEY = "stockflow_session";
export const UNLOCK_HINT_KEY = "stockflow_unlock_hint";
export const SESSION_UPDATED_EVENT = "stockflow-session-updated";

export type UnlockHint = {
  username: string;
  displayName: string;
};

export interface UserSession {
  username: string;
  displayName: string;
  role: string;
  email?: string;
  phone?: string;
  department?: string;
}

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function setSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  setUnlockHint({ username: session.username, displayName: session.displayName });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}

export function getUnlockHint(): UnlockHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UNLOCK_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockHint;
    if (!parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setUnlockHint(hint: UnlockHint) {
  localStorage.setItem(UNLOCK_HINT_KEY, JSON.stringify(hint));
}

export function clearUnlockHint() {
  localStorage.removeItem(UNLOCK_HINT_KEY);
}

export function updateSessionProfile(patch: Partial<UserSession>) {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, ...patch });
}

/** Tên người lập phiếu / báo cáo — ưu tiên họ tên đã cấu hình. */
export function getIssuerName(session: UserSession | null | undefined): string {
  if (!session) return "Thủ kho";
  return session.displayName?.trim() || session.username || "Thủ kho";
}

export function useIssuerName(): string {
  const session = useClientSession();
  return getIssuerName(session);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasSession(): boolean {
  return getSession() !== null;
}

/** Đọc session sau mount — tránh SSR/client lệch khi hydrate. */
export function useClientSession(): UserSession | null {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener(SESSION_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, sync);
  }, []);

  return session;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRoleLabel(role: string): string {
  if (role === "admin" || role === "manager") {
    return i18n.t(`roles.${role}`);
  }
  return i18n.t("roles.default");
}

export function getRoleSubtitle(role: string): string {
  if (role === "admin" || role === "manager") {
    return i18n.t(`roleSubtitle.${role}`);
  }
  return i18n.t("roleSubtitle.default");
}

/** Rút gọn họ tên đầy đủ cho header (VD: Trần Văn Hùng → Trần V. Hùng). */
export function formatShortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return name.trim();
  return `${parts[0]} ${parts[1][0]}. ${parts[parts.length - 1]}`;
}
