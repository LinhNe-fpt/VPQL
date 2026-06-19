import { Printer } from "lucide-react";

export function VoucherPrintButton({
  disabled,
  label = "In phiếu",
  className,
}: {
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => window.print()}
      className={
        className ??
        "h-9 px-3 rounded-lg border border-border bg-card text-[12.5px] font-medium hover:bg-muted flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
      }
    >
      <Printer className="size-3.5" />
      {label}
    </button>
  );
}

export function VoucherPrintHeader() {
  return (
    <div className="hidden print:block mb-6 pb-4 border-b border-black/15">
      <div className="text-[10pt] uppercase tracking-widest text-muted-foreground font-semibold">
        Stockflow · Quản lý kho VPP & BHLĐ
      </div>
    </div>
  );
}

export function VoucherPrintSignatures({
  nguoiLap,
  recipient,
}: {
  nguoiLap?: string | null;
  recipient: string;
}) {
  return (
    <div className="hidden print:grid grid-cols-3 gap-10 mt-10 pt-6 border-t border-black/20 text-[11pt]">
      <div>
        <p className="text-muted-foreground mb-10">Người lập phiếu</p>
        <p className="font-semibold border-t border-black/30 pt-2">{nguoiLap ?? "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground mb-10">Người nhận / trả</p>
        <p className="font-semibold border-t border-black/30 pt-2">{recipient}</p>
      </div>
      <div>
        <p className="text-muted-foreground mb-10">Thủ kho xác nhận</p>
        <p className="border-t border-black/30 pt-2">&nbsp;</p>
      </div>
    </div>
  );
}
