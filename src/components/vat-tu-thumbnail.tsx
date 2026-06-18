import { resolveVatTuImageUrl } from "@/lib/vat-tu-image";

export function VatTuThumbnail({
  maHang,
  tenSanPham,
  hinhAnh,
  size = "md",
  className = "",
}: {
  maHang: string;
  tenSanPham?: string;
  hinhAnh?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const src = resolveVatTuImageUrl(maHang, hinhAnh);
  const dim =
    size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-11";

  return (
    <div
      className={[
        dim,
        "rounded-lg border border-border/70 bg-muted/40 overflow-hidden shrink-0 grid place-items-center",
        className,
      ].join(" ")}
    >
      <img
        src={src}
        alt={tenSanPham ?? maHang}
        className="size-full object-cover"
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.endsWith("default.svg")) return;
          img.src = "/images/vat-tu/default.svg";
        }}
      />
    </div>
  );
}
