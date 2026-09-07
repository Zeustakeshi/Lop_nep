import type { LessonSession, TuitionConfig } from "@prisma/client";

export function isLearnedLessonStatus(status: string) {
  return status === "COMPLETED" || status === "TRIAL" || status === "MAKEUP";
}

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

  if (tuition.type === "FIXED_MONTHLY" || tuition.type === "MANUAL") {
    return { isBillable: false, amount: 0 };
  }

  const amount =
    tuition.type === "PREPAID_PACKAGE"
      ? Math.round((tuition.packagePrice ?? 0) / Math.max(tuition.packageLessons ?? 1, 1))
      : tuition.feePerLesson ?? 0;
  return { isBillable: true, amount };
}

export function calculateReportTotals(params: {
  lessons: Pick<LessonSession, "status" | "isBillable" | "billableAmount">[];
  tuition?: TuitionConfig | null;
  discountAmount?: number;
  surchargeAmount?: number;
  manualAmount?: number;
}) {
  const learnedLessons = params.lessons.filter((lesson) => isLearnedLessonStatus(lesson.status));
  const billableLessons = learnedLessons.filter((lesson) => lesson.isBillable);
  const subtotal =
    params.tuition?.type === "FIXED_MONTHLY"
      ? params.tuition.fixedMonthlyFee ?? 0
      : params.tuition?.type === "MANUAL"
        ? params.manualAmount ?? 0
        : billableLessons.reduce((sum, lesson) => sum + lesson.billableAmount, 0);
  const total =
    subtotal - (params.discountAmount ?? 0) + (params.surchargeAmount ?? 0);

  return {
    totalLessons: learnedLessons.length,
    billableLessons: billableLessons.length,
    subtotalAmount: subtotal,
    totalAmount: Math.max(total, 0)
  };
}
