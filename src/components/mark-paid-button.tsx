"use client";

import { SubmitButton } from "@/components/submit-button";
import { markReportPaid } from "@/lib/actions";

export function MarkPaidButton({ reportId }: { reportId: string }) {
  return (
    <form action={markReportPaid.bind(null, reportId)}>
      <SubmitButton variant="secondary" pendingText="Đang xử lý...">
        Đã nhận đủ
      </SubmitButton>
    </form>
  );
}
