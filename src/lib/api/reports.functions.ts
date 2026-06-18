import { createServerFn } from "@tanstack/react-start";

import { fetchBoPhanList, fetchDashboardQuotaAlerts, fetchReportLines, fetchVatTuList, fetchVoucherSummaries } from "../vpp-queries.server";

export const getReportData = createServerFn({ method: "GET" }).handler(async () => {
  const [lines, vouchers, vatTu, quotaAlerts, boPhan] = await Promise.all([
    fetchReportLines(),
    fetchVoucherSummaries(),
    fetchVatTuList(),
    fetchDashboardQuotaAlerts(),
    fetchBoPhanList(),
  ]);
  return { lines, vouchers, vatTu, vatTuCount: vatTu.length, quotaAlerts, boPhan };
});
