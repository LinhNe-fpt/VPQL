import type { ReportTemplateId } from "./report-workspace";
import type { VoucherType } from "./types/vpp";

type BiPair = { vi: string; ko: string };

export const REPORT_BI: Record<string, BiPair> = {
  brand: { vi: "Stockflow · VPP & BHLĐ", ko: "Stockflow · 사무용품 & 안전보호" },
  internalDoc: { vi: "Tài liệu nội bộ", ko: "내부 문서" },
  period: { vi: "Kỳ báo cáo", ko: "보고 기간" },
  exportedAt: { vi: "Xuất lúc", ko: "출력 시각" },
  preparedBy: { vi: "Người lập", ko: "작성자" },
  template: { vi: "Mẫu", ko: "양식" },
  footerSummary: {
    vi: "Báo cáo lập từ hệ thống Stockflow",
    ko: "Stockflow 시스템에서 생성된 보고서",
  },
  footerInternal: {
    vi: "Tài liệu nội bộ — chỉ phục vụ quản trị kho VPP & BHLĐ, không phát hành ra bên ngoài.",
    ko: "내부 문서 — 사무용품·안전보호 창고 관리용, 외부 배포 금지.",
  },
  sigPreparer: { vi: "Người lập báo cáo", ko: "보고서 작성자" },
  sigApprover: { vi: "Trưởng ban / Phê duyệt", ko: "부서장 / 승인" },
  sigKeeper: { vi: "Thủ kho xác nhận", ko: "창고 담당 확인" },
  linesInPeriod: { vi: "dòng giao dịch trong kỳ", ko: "기간 내 거래 행" },
  skusInCatalog: { vi: "mã hàng trong danh mục", ko: "카탈로그 품목 수" },
  // KPI
  totalIn: { vi: "Tổng nhập", ko: "총 입고" },
  totalOut: { vi: "Tổng xuất", ko: "총 출고" },
  voucherCount: { vi: "Số phiếu", ko: "전표 수" },
  deptActive: { vi: "Ban bộ phát sinh", ko: "거래 발생 부서" },
  deptActiveHint: { vi: "có giao dịch trong kỳ", ko: "기간 내 거래 발생" },
  skuCount: { vi: "Mã hàng", ko: "품목 수" },
  stockValue: { vi: "Giá trị tồn", ko: "재고 가치" },
  lowStock: { vi: "Sắp hết", ko: "재고 부족" },
  totalOutReturn: { vi: "Tổng xuất / thu hồi", ko: "총 출고 / 회수" },
  lines: { vi: "dòng", ko: "행" },
  // Sections
  alertTitle: { vi: "Điểm cần lưu ý", ko: "주의 사항" },
  topItems: { vi: "Top hàng luân chuyển", ko: "회전 상위 품목" },
  byDept: { vi: "Luân chuyển theo ban bộ", ko: "부서별 회전" },
  byDeptShort: { vi: "Theo ban bộ", ko: "부서별" },
  byItem: { vi: "Theo mã hàng", ko: "품목별" },
  transactionDetail: { vi: "Chi tiết giao dịch", ko: "거래 상세" },
  detail: { vi: "Chi tiết", ko: "상세" },
  // Table headers
  colCode: { vi: "Mã", ko: "코드" },
  colItemCode: { vi: "Mã hàng", ko: "품목코드" },
  colItemName: { vi: "Tên vật tư", ko: "품명" },
  colName: { vi: "Tên", ko: "명칭" },
  colGroup: { vi: "Nhóm", ko: "분류" },
  colUnit: { vi: "ĐVT", ko: "단위" },
  colIn: { vi: "Nhập", ko: "입고" },
  colOut: { vi: "Xuất", ko: "출고" },
  colOutReturn: { vi: "Xuất / thu hồi", ko: "출고 / 회수" },
  colLineCount: { vi: "Dòng", ko: "행 수" },
  colDept: { vi: "Ban bộ", ko: "부서" },
  colVoucher: { vi: "Phiếu", ko: "전표" },
  colType: { vi: "Loại", ko: "유형" },
  colDate: { vi: "Ngày", ko: "일자" },
  colRecipient: { vi: "Người nhận", ko: "수령인" },
  colQty: { vi: "SL", ko: "수량" },
  colQtyLong: { vi: "Số lượng", ko: "수량" },
  colStock: { vi: "Tồn", ko: "재고" },
  colMin: { vi: "Min", ko: "최소" },
  colUnitPrice: { vi: "Đơn giá", ko: "단가" },
  colValue: { vi: "Giá trị", ko: "금액" },
  colStatus: { vi: "TT", ko: "상태" },
  info: { vi: "Thông tin", ko: "정보" },
  value: { vi: "Giá trị", ko: "값" },
  note: { vi: "Ghi chú", ko: "비고" },
  metric: { vi: "Chỉ tiêu", ko: "지표" },
  deptCode: { vi: "Mã BP", ko: "부서코드" },
  voucherNo: { vi: "Mã phiếu", ko: "전표번호" },
  voucherType: { vi: "Loại phiếu", ko: "전표 유형" },
  issueDate: { vi: "Ngày lập", ko: "작성일" },
  recipientSource: { vi: "Người nhận / nguồn", ko: "수령인 / 출처" },
  itemGroup: { vi: "Nhóm hàng", ko: "품목 분류" },
  lineDetail: { vi: "Số dòng", ko: "행 수" },
  stable: { vi: "Ổn định", ko: "안정" },
  almostOut: { vi: "Sắp hết", ko: "재고 부족" },
  // Alerts
  lowStockAlert: {
    vi: "mặt hàng đang ở hoặc dưới ngưỡng tồn tối thiểu",
    ko: "품목이 최소 재고 이하",
  },
  quotaAlert: {
    vi: "nhân viên tiêu hao định mức ≥ 75% trong tháng",
    ko: "직원 월 정량 75% 이상 소진",
  },
  // Empty / hints
  noTransactions: { vi: "Không có giao dịch trong kỳ đã chọn.", ko: "선택 기간에 거래가 없습니다." },
  noDistribution: { vi: "Không có phiếu cấp phát trong kỳ.", ko: "기간 내 지급 전표가 없습니다." },
  previewLimit: {
    vi: "Hiển thị 50/{{total}} dòng — xuất Excel để xem đầy đủ.",
    ko: "50/{{total}}행 표시 — 전체는 Excel로보내기.",
  },
};

export const REPORT_TEMPLATE_BI: Record<
  ReportTemplateId,
  { label: BiPair; description: BiPair; title: BiPair }
> = {
  executive: {
    label: { vi: "Tổng hợp quản trị", ko: "경영 종합" },
    description: {
      vi: "KPI nhập–xuất, top hàng, phân bổ bộ phận — phù hợp trình ban lãnh đạo",
      ko: "입출고 KPI, 상위 품목, 부서별 배분 — 경영진 보고용",
    },
    title: { vi: "Báo cáo tổng hợp quản trị", ko: "경영 종합 보고서" },
  },
  transactions: {
    label: { vi: "Chi tiết giao dịch", ko: "거래 상세" },
    description: {
      vi: "Danh sách phiếu và từng dòng hàng trong kỳ",
      ko: "기간 내 전표 및 품목 라인 목록",
    },
    title: { vi: "Báo cáo chi tiết giao dịch", ko: "거래 상세 보고서" },
  },
  inventory: {
    label: { vi: "Tồn kho & cảnh báo", ko: "재고 및 경고" },
    description: {
      vi: "Tình trạng tồn, giá trị kho và hàng sắp hết mức tối thiểu",
      ko: "재고 현황, 재고 가치, 최소 재고 미달 품목",
    },
    title: { vi: "Báo cáo tồn kho & cảnh báo", ko: "재고 및 경고 보고서" },
  },
  distribution: {
    label: { vi: "Cấp phát & thu hồi", ko: "지급 및 회수" },
    description: {
      vi: "Xuất cá nhân, phòng ban, cược đồ và thu hồi BHLĐ",
      ko: "개인·부서 지급, 유니폼, 안전보호 회수",
    },
    title: { vi: "Báo cáo cấp phát & thu hồi", ko: "지급 및 회수 보고서" },
  },
};

export const VOUCHER_LABEL_KO: Record<VoucherType, string> = {
  NHAP: "입고 – 공급업체",
  XUAT_CN: "지급 – 개인",
  XUAT_PB: "지급 – 부서",
  THU_HOI: "회수 – 창고 반입",
  THU_HOI_BHLD: "회수 – 안전보호",
  XUAT_CUOC_NV: "유니폼 – 직원",
  XUAT_CUOC_CN: "유니폼 – 작업자",
  XUAT_CUOC_PB: "유니폼 – 부서",
  KIEM_KE: "실사 – 재고 조정",
};

export function reportBi(key: keyof typeof REPORT_BI): string {
  const pair = REPORT_BI[key];
  return `${pair.vi} / ${pair.ko}`;
}

export function reportBiPair(key: keyof typeof REPORT_BI): BiPair {
  return REPORT_BI[key];
}

export function reportTemplateBi(
  id: ReportTemplateId,
  field: "label" | "description" | "title",
): string {
  const pair = REPORT_TEMPLATE_BI[id][field];
  return `${pair.vi} / ${pair.ko}`;
}

export function voucherLabelBi(type: VoucherType, viLabel: string): string {
  return `${viLabel} / ${VOUCHER_LABEL_KO[type]}`;
}

/** Table header: Vietnamese / Korean (compact for narrow columns). */
export function reportColBi(key: keyof typeof REPORT_BI): string {
  return reportBi(key);
}

export function reportExcelCol(key: keyof typeof REPORT_BI): string {
  const { vi, ko } = REPORT_BI[key];
  return `${vi} (${ko})`;
}
