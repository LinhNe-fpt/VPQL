/** Print / PDF styles for administrative reports (reports page). */
export function ReportPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4 portrait;
          margin: 12mm 11mm 14mm 11mm;
        }

        html,
        body {
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body * {
          visibility: hidden;
        }

        .report-print-area,
        .report-print-area * {
          visibility: visible;
        }

        .report-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        .no-print {
          display: none !important;
        }

        .report-print-root {
          display: block !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
          grid-template-columns: 1fr !important;
        }

        .report-print-main {
          overflow: visible !important;
          padding: 0 !important;
          background: white !important;
        }

        .report-print-area {
          box-shadow: none !important;
          border: none !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
          color: #111 !important;
          font-family: Arial, "Segoe UI", sans-serif;
          font-size: 10pt;
          line-height: 1.35;
        }

        .report-doc-header h1 {
          font-size: 15.5pt !important;
          color: #111 !important;
        }

        .report-doc-header .subtitle {
          color: #444 !important;
        }

        .report-kpi-grid {
          gap: 6pt !important;
        }

        .report-kpi-card {
          border: 1px solid #555 !important;
          border-radius: 3pt !important;
          padding: 7pt 9pt !important;
          background: #f5f7fa !important;
          box-shadow: none !important;
        }

        .report-kpi-card .kpi-value {
          font-size: 13pt !important;
          color: #111 !important;
        }

        .report-kpi-card .kpi-icon {
          opacity: 0.85;
        }

        .report-alert-box {
          border: 1px solid #b45309 !important;
          background: #fffbeb !important;
          border-radius: 3pt !important;
          color: #78350f !important;
        }

        .report-section-title {
          font-size: 10.5pt !important;
          font-weight: 700 !important;
          color: #111 !important;
          border-bottom: 1px solid #333 !important;
          padding-bottom: 3pt !important;
          margin: 10pt 0 6pt !important;
        }

        .report-table-wrap {
          border: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        .report-data-table {
          border-collapse: collapse !important;
          width: 100%;
          font-size: 8.5pt !important;
          page-break-inside: auto;
        }

        .report-data-table thead {
          display: table-header-group;
        }

        .report-data-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }

        .report-data-table th {
          background: #d9eaf7 !important;
          border: 1px solid #333 !important;
          padding: 4pt 5pt !important;
          font-weight: 700 !important;
          font-size: 7.5pt !important;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #111 !important;
          vertical-align: middle;
        }

        .report-data-table td {
          border: 1px solid #333 !important;
          padding: 3.5pt 5pt !important;
          color: #111 !important;
          vertical-align: middle;
        }

        .report-data-table td.mono {
          font-family: Consolas, "Courier New", monospace;
          font-size: 8pt !important;
          color: #1d4ed8 !important;
        }

        .report-data-table td.num {
          text-align: right !important;
          font-variant-numeric: tabular-nums;
        }

        .report-data-table td.warn {
          text-align: center !important;
          color: #b45309 !important;
          font-weight: 700 !important;
        }

        .report-doc-footer {
          border-top: 1px solid #333 !important;
          margin-top: 14pt !important;
          padding-top: 6pt !important;
          font-size: 8pt !important;
          color: #444 !important;
        }

        .report-signature-block {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18pt;
          margin-top: 18pt;
          font-size: 9pt;
        }

        .report-signature-block .sig-line {
          border-top: 1px solid #333 !important;
          padding-top: 4pt !important;
          margin-top: 28pt !important;
          font-weight: 600;
          color: #111 !important;
        }

        .report-internal-stamp {
          border: 1px solid #666 !important;
          padding: 4pt 8pt !important;
          font-size: 7.5pt !important;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #444 !important;
        }
      }
    `}</style>
  );
}
