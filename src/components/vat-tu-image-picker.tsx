import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { VatTuThumbnail } from "@/components/vat-tu-thumbnail";
import { normalizeVatTuImagePath } from "@/lib/vat-tu-image";
import { uploadVatTuImage } from "@/lib/api/product.functions";
import { ImagePlus, Loader2, X } from "lucide-react";

const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function VatTuImagePicker({
  maHang,
  tenSanPham,
  value,
  onChange,
}: {
  maHang: string;
  tenSanPham?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (dataUrl: string) =>
      uploadVatTuImage({
        data: { maHang: maHang.trim().toUpperCase(), dataUrl },
      }),
    onSuccess: (result) => {
      onChange(result.url);
      setLocalPreview(null);
      toast.success("Đã tải ảnh lên");
    },
    onError: (err) => {
      setLocalPreview(null);
      toast.error(err instanceof Error ? err.message : "Không tải được ảnh");
    },
  });

  function openPicker() {
    if (!maHang.trim()) {
      toast.error("Nhập hoặc chọn mã hàng trước khi tải ảnh");
      return;
    }
    inputRef.current?.click();
  }

  function handleFile(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ảnh quá lớn (tối đa 3MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setLocalPreview(dataUrl);
      uploadMutation.mutate(dataUrl);
    };
    reader.onerror = () => toast.error("Không đọc được file ảnh");
    reader.readAsDataURL(file);
  }

  const previewUrl = localPreview ?? value;
  const uploading = uploadMutation.isPending;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/30">
        <div className="relative">
          {previewUrl ? (
            <VatTuThumbnail
              maHang={maHang}
              tenSanPham={tenSanPham}
              hinhAnh={previewUrl}
              size="md"
            />
          ) : (
            <div className="size-11 rounded-lg border border-dashed border-border bg-muted/50 grid place-items-center text-muted-foreground">
              <ImagePlus className="size-5" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-lg bg-background/70 grid place-items-center">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary-hover disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <ImagePlus className="size-3.5" />
              Chọn ảnh từ thiết bị
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="h-8 px-2.5 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-muted inline-flex items-center gap-1"
              >
                <X className="size-3.5" /> Xóa ảnh
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, GIF · tối đa 3MB</p>
        </div>
      </div>

      <input
        value={value}
        onChange={(e) => onChange(normalizeVatTuImagePath(e.target.value) ?? e.target.value)}
        placeholder="/images/vat-tu/uploads/… hoặc dùng nút chọn ảnh"
        className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-mono outline-none focus:ring-2 focus:ring-primary/25"
      />
    </div>
  );
}
