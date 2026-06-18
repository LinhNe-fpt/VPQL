import { createServerFn } from "@tanstack/react-start";

import { fetchVatTuDongPhucList } from "../vpp-queries.server";

export const getBhldVatTuList = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVatTuDongPhucList();
});
