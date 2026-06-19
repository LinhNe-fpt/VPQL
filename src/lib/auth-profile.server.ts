import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export type AuthUserRecord = {
  username: string;
  password: string;
  displayName: string;
  role: string;
};

export type ProfileOverride = {
  displayName?: string;
  email?: string;
  phone?: string;
  department?: string;
  password?: string;
  /** Mã PIN 4–6 chữ số — đăng nhập nhanh sau đăng xuất */
  pin?: string;
};

export type PublicUserProfile = {
  username: string;
  displayName: string;
  role: string;
  email: string;
  phone: string;
  department: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILE_FILE = path.join(DATA_DIR, "user-profiles.json");

export function getAuthUsersFromEnv(): AuthUserRecord[] {
  return [
    {
      username: process.env.AUTH_USERNAME ?? "thukho",
      password: process.env.AUTH_PASSWORD ?? "123",
      displayName: process.env.AUTH_DISPLAY_NAME ?? "Trần Văn Hùng",
      role: "admin",
    },
    {
      username: process.env.AUTH_USERNAME_2 ?? "quanly",
      password: process.env.AUTH_PASSWORD_2 ?? "123",
      displayName: process.env.AUTH_DISPLAY_NAME_2 ?? "Nguyễn Thị Lan",
      role: "manager",
    },
  ];
}

function readOverrides(): Record<string, ProfileOverride> {
  try {
    if (!fs.existsSync(PROFILE_FILE)) return {};
    const raw = fs.readFileSync(PROFILE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, ProfileOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(data: Record<string, ProfileOverride>) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(PROFILE_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function mergeUserProfile(user: AuthUserRecord): PublicUserProfile {
  const override = readOverrides()[user.username] ?? {};
  return {
    username: user.username,
    displayName: override.displayName?.trim() || user.displayName,
    role: user.role,
    email: override.email?.trim() ?? "",
    phone: override.phone?.trim() ?? "",
    department: override.department?.trim() ?? "",
  };
}

export function verifyCredentials(username: string, password: string): AuthUserRecord | null {
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) return null;
  const override = readOverrides()[username];
  const effectivePassword = override?.password ?? base.password;
  if (effectivePassword !== password) return null;
  return { ...base, password: effectivePassword };
}

export function saveProfileOverride(username: string, patch: ProfileOverride): PublicUserProfile {
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) throw new Error("Tài khoản không tồn tại.");
  const all = readOverrides();
  const current = all[username] ?? {};
  all[username] = { ...current, ...patch };
  writeOverrides(all);
  return mergeUserProfile(base);
}

const PIN_RE = /^\d{4,6}$/;

export function readUserPin(username: string): string | null {
  const pin = readOverrides()[username]?.pin;
  return pin && PIN_RE.test(pin) ? pin : null;
}

export function userHasPin(username: string): boolean {
  return readUserPin(username) !== null;
}

export function verifyUserPin(username: string, pin: string): AuthUserRecord | null {
  const stored = readUserPin(username);
  if (!stored || stored !== pin) return null;
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) return null;
  const override = readOverrides()[username];
  const effectivePassword = override?.password ?? base.password;
  return { ...base, password: effectivePassword };
}

export function getUnlockInfo(username: string): { username: string; displayName: string; hasPin: boolean } | null {
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) return null;
  const profile = mergeUserProfile(base);
  return {
    username,
    displayName: profile.displayName,
    hasPin: userHasPin(username),
  };
}

export function saveUserPin(username: string, pin: string): void {
  if (!PIN_RE.test(pin)) throw new Error("PIN phải gồm 4–6 chữ số.");
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) throw new Error("Tài khoản không tồn tại.");
  saveProfileOverride(username, { pin });
}

export function getAuthUserRole(username: string): string | null {
  return getAuthUsersFromEnv().find((u) => u.username === username)?.role ?? null;
}

export function isAdminUsername(username: string): boolean {
  return getAuthUserRole(username) === "admin";
}

export function removeUserPin(username: string): void {
  const base = getAuthUsersFromEnv().find((u) => u.username === username);
  if (!base) throw new Error("Tài khoản không tồn tại.");
  const all = readOverrides();
  const current = all[username];
  if (!current?.pin) return;
  const next = { ...current };
  delete next.pin;
  if (Object.keys(next).length === 0) delete all[username];
  else all[username] = next;
  writeOverrides(all);
}
