import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getAuthUsersFromEnv,
  getUnlockInfo,
  mergeUserProfile,
  removeUserPin,
  saveProfileOverride,
  saveUserPin,
  userHasPin,
  verifyCredentials,
  verifyUserPin,
} from "../auth-profile.server";
import { getClientConnectionMeta } from "../client-connection.server";
import { insertLoginHistory } from "../login-history.server";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập mã đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

async function logLoginAttempt(params: {
  maDangNhap: string;
  hoTen?: string | null;
  phuongThuc: "PASSWORD" | "PIN";
  ketQua: "SUCCESS" | "FAILED";
}) {
  const { ip, userAgent } = getClientConnectionMeta();
  await insertLoginHistory({
    maDangNhap: params.maDangNhap,
    hoTen: params.hoTen,
    phuongThuc: params.phuongThuc,
    ketQua: params.ketQua,
    diaChiIP: ip,
    userAgent,
  });
}

export const login = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const username = data.username.trim();
    const user = verifyCredentials(username, data.password);
    if (!user) {
      await logLoginAttempt({ maDangNhap: username, phuongThuc: "PASSWORD", ketQua: "FAILED" });
      throw new Error("Mã đăng nhập hoặc mật khẩu không đúng.");
    }
    const profile = mergeUserProfile(user);
    await logLoginAttempt({
      maDangNhap: profile.username,
      hoTen: profile.displayName,
      phuongThuc: "PASSWORD",
      ketQua: "SUCCESS",
    });
    return {
      username: profile.username,
      displayName: profile.displayName,
      role: profile.role,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
    };
  });

export const getUnlockInfoFn = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string().min(1) }))
  .handler(async ({ data }) => {
    const info = getUnlockInfo(data.username.trim());
    if (!info) return { found: false as const };
    return { found: true as const, ...info };
  });

const pinLoginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, "PIN phải gồm 4–6 chữ số"),
});

export const loginWithPin = createServerFn({ method: "POST" })
  .validator(pinLoginSchema)
  .handler(async ({ data }) => {
    const username = data.username.trim();
    const user = verifyUserPin(username, data.pin);
    if (!user) {
      await logLoginAttempt({ maDangNhap: username, phuongThuc: "PIN", ketQua: "FAILED" });
      throw new Error("Mã PIN không đúng.");
    }
    const profile = mergeUserProfile(user);
    await logLoginAttempt({
      maDangNhap: profile.username,
      hoTen: profile.displayName,
      phuongThuc: "PIN",
      ketQua: "SUCCESS",
    });
    return {
      username: profile.username,
      displayName: profile.displayName,
      role: profile.role,
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
    };
  });

export const getPinStatus = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string().min(1) }))
  .handler(async ({ data }) => ({
    hasPin: userHasPin(data.username.trim()),
  }));

const setPinSchema = z
  .object({
    username: z.string().min(1),
    currentPassword: z.string().min(1),
    pin: z.string().regex(/^\d{4,6}$/, "PIN phải gồm 4–6 chữ số"),
    confirmPin: z.string().min(1),
  })
  .refine((v) => v.pin === v.confirmPin, {
    message: "PIN xác nhận không khớp",
    path: ["confirmPin"],
  });

export const setLoginPin = createServerFn({ method: "POST" })
  .validator(setPinSchema)
  .handler(async ({ data }) => {
    const user = verifyCredentials(data.username, data.currentPassword);
    if (!user) throw new Error("Mật khẩu hiện tại không đúng.");
    saveUserPin(data.username, data.pin);
    return { hasPin: true };
  });

export const removeLoginPin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().min(1),
      currentPassword: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const user = verifyCredentials(data.username, data.currentPassword);
    if (!user) throw new Error("Mật khẩu hiện tại không đúng.");
    removeUserPin(data.username);
    return { hasPin: false };
  });

const profileUpdateSchema = z.object({
  username: z.string().min(1),
  currentPassword: z.string().min(1),
  displayName: z.string().min(1, "Nhập họ tên"),
  email: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .validator(profileUpdateSchema)
  .handler(async ({ data }) => {
    const user = verifyCredentials(data.username, data.currentPassword);
    if (!user) throw new Error("Mật khẩu hiện tại không đúng.");
    return saveProfileOverride(data.username, {
      displayName: data.displayName.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim(),
      department: data.department?.trim(),
    });
  });

const passwordChangeSchema = z
  .object({
    username: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(4, "Mật khẩu mới tối thiểu 4 ký tự"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const changeUserPassword = createServerFn({ method: "POST" })
  .validator(passwordChangeSchema)
  .handler(async ({ data }) => {
    const user = verifyCredentials(data.username, data.currentPassword);
    if (!user) throw new Error("Mật khẩu hiện tại không đúng.");
    if (data.currentPassword === data.newPassword) {
      throw new Error("Mật khẩu mới phải khác mật khẩu cũ.");
    }
    if (!getAuthUsersFromEnv().some((u) => u.username === data.username)) {
      throw new Error("Tài khoản không tồn tại.");
    }
    return saveProfileOverride(data.username, { password: data.newPassword });
  });
