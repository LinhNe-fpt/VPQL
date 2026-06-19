import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isAdminUsername } from "../auth-profile.server";
import { fetchLoginHistory } from "../login-history.server";

const querySchema = z.object({
  viewerUsername: z.string().min(1),
  q: z.string().max(255).optional().nullable(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const getLoginHistory = createServerFn({ method: "GET" })
  .validator(querySchema)
  .handler(async ({ data }) => {
    const viewer = data.viewerUsername.trim();
    const isAdmin = isAdminUsername(viewer);
    return fetchLoginHistory({
      maDangNhap: isAdmin ? null : viewer,
      q: data.q ?? null,
      limit: data.limit ?? 100,
    });
  });
