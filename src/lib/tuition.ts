import type { LessonSession, TuitionConfig, TuitionType } from "@prisma/client";

export function isLearnedLessonStatus(status: string) {
  return status === "COMPLETED" || status === "TRIAL" || status === "MAKEUP";
}

/**
 * Kiểm tra chế độ có cho phép tùy chỉnh giá từng buổi
 */
export function canCustomizePerLesson(tuitionType: TuitionType | null): boolean {
  return tuitionType === "THEO_BUOI";
}

/**
 * Lấy giá buổi học (có override hay không)
 * Áp dụng cho THEO_BUOI
 */
export function getLessonFee(
  lesson: Pick<LessonSession, "customFee">,
  tuition: Pick<TuitionConfig, "feePerLesson" | "type"> | null
): number {
  // Nếu có customFee, sử dụng customFee
  if (lesson.customFee !== null) {
    return lesson.customFee;
  }
  // Ngược lại sử dụng feePerLesson từ config
  return tuition?.feePerLesson ?? 0;
}

/**
 * Tính số tiền mặc định cho buổi học
 * THEO_BUOI: Giá mặc định từ config (có thể override từng buổi)
 * THEO_THANG: Không tính tự động theo buổi - tiền cố định theo tháng
 * THEO_GOI: Coming soon
 */
export function defaultBillableAmount(
  status: LessonSession["status"],
  tuition?: TuitionConfig | null
) {
  const shouldBill =
    status === "COMPLETED" || status === "TRIAL" || status === "MAKEUP";

  if (!shouldBill) {
    return { isBillable: false, amount: 0 };
  }

  if (!tuition) {
    return { isBillable: shouldBill, amount: 0 };
  }

  // THEO_THANG: Tiền cố định theo tháng, không tính tự động từng buổi
  if (tuition.type === "THEO_THANG") {
    return { isBillable: false, amount: 0 };
  }

  // THEO_GOI: Coming soon
  if (tuition.type === "THEO_GOI") {
    return { isBillable: false, amount: 0 };
  }

  // THEO_BUOI: Tính theo feePerLesson
  const amount = tuition.feePerLesson ?? 0;
  return { isBillable: true, amount };
}

/**
 * Tính tổng báo cáo theo chế độ tính tiền mới
 * THEO_BUOI: Tổng = sum(customFee hoặc feePerLesson cho các buổi đã học)
 * THEO_THANG: Tiền cố định theo tháng
 * THEO_GOI: Coming soon
 */
export function calculateReportTotals(params: {
  lessons: Pick<LessonSession, "status" | "isBillable" | "billableAmount" | "customFee">[];
  tuition?: TuitionConfig | null;
  discountAmount?: number;
  surchargeAmount?: number;
}) {
  const learnedLessons = params.lessons.filter((lesson) =>
    isLearnedLessonStatus(lesson.status)
  );
  const billableLessons = learnedLessons.filter((lesson) => lesson.isBillable);

  let subtotal = 0;
  const tuitionType = params.tuition?.type;

  switch (tuitionType) {
    case "THEO_BUOI":
      // Tổng = sum(customFee hoặc feePerLesson cho các buổi đã học)
      subtotal = billableLessons.reduce(
        (sum, lesson) => sum + getLessonFee(lesson, params.tuition ?? null),
        0
      );
      break;

    case "THEO_THANG":
      // Tiền cố định theo tháng
      subtotal = params.tuition?.fixedMonthlyFee ?? 0;
      break;

    case "THEO_GOI":
      // Coming soon - không tính tự động
      subtotal = 0;
      break;

    default:
      // Fallback: tính như cũ
      subtotal = billableLessons.reduce((sum, lesson) => sum + lesson.billableAmount, 0);
  }

  const total =
    subtotal - (params.discountAmount ?? 0) + (params.surchargeAmount ?? 0);

  return {
    totalLessons: learnedLessons.length,
    billableLessons: billableLessons.length,
    subtotalAmount: subtotal,
    totalAmount: Math.max(total, 0),
  };
}
