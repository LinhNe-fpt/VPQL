import { createServerFn } from "@tanstack/react-start";

import { fetchVatTuList } from "../vpp-queries.server";

export const getVatTuList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVatTuList();
});
