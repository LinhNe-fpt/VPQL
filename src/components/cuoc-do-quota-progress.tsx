import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getCuocDoTienDo } from "@/lib/api/cuocdo.functions";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function CuocDoQuotaProgress({ maNV }: { maNV: string }) {
  const { t } = useTranslation();
  const code = maNV.trim();

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ["cuoc-do-tien-do", code],
    queryFn: () => getCuocDoTienDo({ data: { maNV: code } }),
    enabled: code.length > 0,
  });

  if (!code) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-2">
        <Loader2 className="size-3.5 animate-spin" />
        {t("pages.cuocDo.quotaLoading")}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-[11.5px] text-destructive">{t("pages.cuocDo.quotaLoadError")}</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[11.5px] text-muted-foreground rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
        {t("pages.cuocDo.quotaEmpty")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border/60 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("pages.cuocDo.quotaYear")} · {new Date().getFullYear()}
      </div>
      <ul className="divide-y divide-border/50 max-h-40 overflow-auto">
        {items.map((row) => {
          const pct = Math.min(100, Math.round(row.phanTramDaDung));
          const tone =
            pct >= 100
              ? "bg-destructive"
              : pct >= 75
                ? "bg-amber-500"
                : "bg-primary";
          return (
            <li key={row.maHang} className="px-3 py-2 text-[12px]">
              <div className="flex justify-between gap-2 font-medium">
                <span className="truncate">{row.tenSanPham}</span>
                <span className="text-muted-foreground shrink-0 font-mono text-[10.5px]">{row.maHang}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{fmt(row.daDung)}/{fmt(row.soLuongToiDa)}</span>
                <span>· {t("pages.cuocDo.quotaRemain", { count: fmt(row.conLai) })}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
