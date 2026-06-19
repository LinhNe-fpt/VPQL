/** Global print rules for voucher detail pages (transactions, cược đồ). */
export function VoucherPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4;
          margin: 12mm;
        }
        body {
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print {
          display: none !important;
        }
        .voucher-print-root {
          display: block !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
          grid-template-columns: 1fr !important;
        }
        .voucher-print-pane {
          overflow: visible !important;
          padding: 0 !important;
        }
        .voucher-print-area {
          box-shadow: none !important;
          border: none !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        .voucher-print-area table {
          font-size: 11pt;
        }
        .voucher-print-area th,
        .voucher-print-area td {
          padding: 6px 8px !important;
        }
      }
    `}</style>
  );
}
