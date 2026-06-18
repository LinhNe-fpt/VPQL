import type { BoPhanRow } from "./types/vpp";

/** Thứ tự hiển thị bộ phận chuẩn */
export const BO_PHAN_ORDER = ["HG", "EQM", "SX", "MM", "SM", "CS", "QC"] as const;

export function formatBoPhanLabel(bp: Pick<BoPhanRow, "maBoPhan" | "tenBoPhan">): string {
  return bp.maBoPhan ? `${bp.maBoPhan} — ${bp.tenBoPhan}` : bp.tenBoPhan;
}

export function boPhanSortKey(maBoPhan: string | null): number {
  if (!maBoPhan) return 999;
  const idx = BO_PHAN_ORDER.indexOf(maBoPhan as (typeof BO_PHAN_ORDER)[number]);
  return idx === -1 ? 500 : idx;
}
