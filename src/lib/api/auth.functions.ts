import { createServerFn } from "@tanstack/react-start";
import process from "node:process";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập mã đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

function getAuthUsers() {
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

export const login = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const user = getAuthUsers().find(
      (u) => u.username === data.username && u.password === data.password,
    );
    if (!user) {
      throw new Error("Mã đăng nhập hoặc mật khẩu không đúng.");
    }
    return {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  });
