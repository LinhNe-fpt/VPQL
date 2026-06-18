import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchAuditHistory } from "../vpp-queries.server";

const auditQuerySchema = z.object({
  bangDuLieu: z.string().max(100).optional().nullable(),
  maBanGhi: z.string().max(255).optional().nullable(),
  q: z.string().max(255).optional().nullable(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const getAuditHistory = createServerFn({ method: "GET" })
  .validator(auditQuerySchema.optional())
  .handler(async ({ data }) => {
    return fetchAuditHistory(data ?? undefined);
  });
